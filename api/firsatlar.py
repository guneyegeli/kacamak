from flask import Blueprint, request, jsonify
import sqlite3, json, os, logging

bp = Blueprint("firsatlar", __name__)
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
log = logging.getLogger("firsatlar")

@bp.route("/api/firsatlar", methods=["GET"])
def firsatlar_listele():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT *,
            CASE WHEN olusturulma > datetime('now', '-24 hours') THEN 1 ELSE 0 END AS yeni
        FROM firsatlar
        WHERE (aktif = 1 OR aktif IS NULL)
        AND (gecerlilik > datetime('now') OR gecerlilik IS NULL)
        ORDER BY
            CASE WHEN olusturulma > datetime('now', '-24 hours') THEN 0 ELSE 1 END,
            indirim_orani DESC
        LIMIT 50
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@bp.route("/api/firsatlar/<int:firsat_id>", methods=["GET"])
def firsat_detay(firsat_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    firsat = conn.execute(
        "SELECT * FROM firsatlar WHERE id=?", (firsat_id,)
    ).fetchone()
    paket = conn.execute(
        "SELECT * FROM paketler WHERE firsat_id=?", (firsat_id,)
    ).fetchone()
    conn.close()
    if not firsat:
        return jsonify({"hata": "Bulunamadı"}), 404
    return jsonify({
        "firsat": dict(firsat),
        "paket": json.loads(paket["icerik"]) if paket else None
    })


@bp.route("/api/firsatlar/<int:firsat_id>/alternatifler", methods=["GET"])
def alternatif_tarihler(firsat_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    firsat = conn.execute(
        "SELECT cikis, varis, ucus_tarihi, donus_tarihi, fiyat FROM firsatlar WHERE id=?",
        (firsat_id,)
    ).fetchone()
    if not firsat:
        conn.close()
        return jsonify([])

    origin = firsat["cikis"]
    dest = firsat["varis"]
    mevcut_tarih = firsat["ucus_tarihi"] or ""

    # DB'den farklı tarihlerdeki fırsatları çek (aynı tarih grubundan en ucuzu)
    rows = conn.execute("""
        SELECT MIN(id) as id, ucus_tarihi, donus_tarihi, MIN(fiyat) as fiyat, MAX(indirim_orani) as indirim_orani
        FROM firsatlar
        WHERE cikis = ? AND varis = ?
        AND ucus_tarihi >= date('now')
        AND ucus_tarihi != ?
        AND (aktif = 1 OR aktif IS NULL)
        AND (gecerlilik > datetime('now') OR gecerlilik IS NULL)
        GROUP BY ucus_tarihi
        ORDER BY fiyat ASC
        LIMIT 10
    """, (origin, dest, mevcut_tarih)).fetchall()
    conn.close()

    sonuc = [dict(r) for r in rows]

    # DB'de yeterli farklı tarih yoksa Travelpayouts month-matrix'ten çek
    if len(sonuc) < 5:
        try:
            from services.travelpayouts import aylik_matris_getir
            from datetime import datetime, timedelta
            matris = aylik_matris_getir(origin, dest)
            gorulmus = {mevcut_tarih} | {r["ucus_tarihi"] for r in sonuc}
            bugun = datetime.now().strftime("%Y-%m-%d")
            for entry in matris:
                tarih = entry.get("depart_date", "")
                fiyat = entry.get("value") or entry.get("price")
                donus = entry.get("return_date", "")
                if not tarih or not fiyat or tarih in gorulmus or tarih < bugun:
                    continue
                # Dönüş tarihi boşsa gidiş + 4 gün olarak hesapla
                if not donus:
                    try:
                        donus = (datetime.strptime(tarih, "%Y-%m-%d") + timedelta(days=4)).strftime("%Y-%m-%d")
                    except ValueError:
                        donus = ""
                gorulmus.add(tarih)
                indirim = 0
                if firsat["fiyat"] and fiyat < firsat["fiyat"]:
                    indirim = int((1 - fiyat / firsat["fiyat"]) * 100)
                sonuc.append({
                    "id": None,
                    "ucus_tarihi": tarih,
                    "donus_tarihi": donus,
                    "fiyat": fiyat,
                    "indirim_orani": indirim,
                    "kaynak": "month-matrix"
                })
        except Exception as e:
            log.warning("Alternatif tarih month-matrix hatası: %s", e)

    # Fiyata göre sırala, en ucuz üstte
    sonuc.sort(key=lambda x: x.get("fiyat") or 999999)
    return jsonify(sonuc[:5])


@bp.route("/api/firsatlar/<int:firsat_id>/benzer", methods=["GET"])
def benzer_firsatlar(firsat_id):
    from services.bolge import YURTICI
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    firsat = conn.execute(
        "SELECT id, cikis, varis, fiyat FROM firsatlar WHERE id=?", (firsat_id,)
    ).fetchone()
    if not firsat:
        conn.close()
        return jsonify([])

    fiyat = firsat["fiyat"] or 0
    fiyat_min = max(fiyat - 1500, 0)
    fiyat_max = fiyat + 1500
    yurtici = firsat["varis"] in YURTICI

    # Aynı bölgedeki (yurtiçi/yurtdışı) ve benzer fiyat aralığındaki fırsatlar
    rows = conn.execute("""
        SELECT * FROM firsatlar
        WHERE id != ?
        AND fiyat BETWEEN ? AND ?
        AND (aktif = 1 OR aktif IS NULL)
        AND (gecerlilik > datetime('now') OR gecerlilik IS NULL)
        ORDER BY indirim_orani DESC
        LIMIT 50
    """, (firsat_id, fiyat_min, fiyat_max)).fetchall()
    conn.close()

    # Bölge filtresi: Python tarafında uygula (SQLite'da set membership zor)
    sonuc = []
    for r in rows:
        r_yurtici = r["varis"] in YURTICI
        if r_yurtici == yurtici:
            sonuc.append(dict(r))
            if len(sonuc) >= 6:
                break

    return jsonify(sonuc)


@bp.route("/api/firsat/<int:firsat_id>/itinerary-olustur", methods=["POST"])
def itinerary_olustur_endpoint(firsat_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    firsat = conn.execute("SELECT * FROM firsatlar WHERE id=?", (firsat_id,)).fetchone()
    if not firsat:
        conn.close()
        return jsonify({"hata": "Fırsat bulunamadı"}), 404

    # Zaten itinerary varsa tekrar üretme
    paket = conn.execute(
        "SELECT * FROM paketler WHERE firsat_id=?", (firsat_id,)
    ).fetchone()
    if paket and paket["icerik"]:
        conn.close()
        icerik = json.loads(paket["icerik"])
        return jsonify({"paket": icerik, "kaynak": "cache"})

    conn.close()

    firsat_dict = dict(firsat)

    try:
        from agents.itinerary_uretici import itinerary_olustur, gece_hesapla
        gece = gece_hesapla(firsat_dict)
        log.info("Itinerary üretiliyor: firsat_id=%d, varis=%s, gece=%d", firsat_id, firsat_dict.get("varis"), gece)
        itinerary = itinerary_olustur(firsat_dict)
    except Exception as e:
        log.error("Itinerary üretim hatası: %s", e)
        return jsonify({"hata": f"Itinerary üretilemedi: {str(e)}"}), 500

    if not itinerary:
        return jsonify({"hata": "Claude API boş yanıt döndü"}), 500

    # Aktiviteleri ekle
    try:
        from services.aktivite import aktiviteler_getir
        aktiviteler = aktiviteler_getir(firsat_dict.get("varis", ""))
        if aktiviteler:
            itinerary["aktiviteler"] = aktiviteler
    except Exception as e:
        log.warning("Aktivite getirme hatası: %s", e)

    # DB'ye kaydet
    icerik_json = json.dumps(itinerary, ensure_ascii=False)
    conn = sqlite3.connect(DB)
    try:
        conn.execute(
            "INSERT INTO paketler (firsat_id, icerik) VALUES (?,?)",
            (firsat_id, icerik_json)
        )
        conn.commit()
        log.info("Itinerary kaydedildi: firsat_id=%d", firsat_id)
    except Exception as e:
        log.warning("Itinerary kayıt hatası (muhtemelen zaten var): %s", e)
    finally:
        conn.close()

    return jsonify({"paket": itinerary, "kaynak": "yeni"})
