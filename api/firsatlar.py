from flask import Blueprint, request, jsonify
import sqlite3, json, os, logging

bp = Blueprint("firsatlar", __name__)
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
log = logging.getLogger("firsatlar")

@bp.route("/api/firsatlar", methods=["GET"])
def firsatlar_listele():
    from services.bolge import YURTICI
    from services.koordinat import ULKE_ADLARI, SEHIR_ADLARI

    # Popüler turistik şehirler — sıralamada öncelik alır
    POPULER = {
        'CDG', 'PAR', 'LHR', 'LON', 'FCO', 'ROM', 'BCN', 'AMS', 'BER',
        'PRG', 'BUD', 'VIE', 'ATH', 'LIS', 'MAD', 'MXP', 'DUB', 'CPH',
        'BKK', 'DXB', 'SIN', 'HND', 'NRT', 'ICN', 'JFK', 'MLE',
        'TBS', 'GYD', 'OTP', 'BEG', 'ZAG', 'SJJ',
    }
    MAKS_YURTICI = 5
    MAKS_ULKE = 3

    # Çıkış havalimanı filtresi (tercihlerden)
    cikis_param = request.args.get("cikis", "")
    cikis_filtre = set(cikis_param.split(",")) if cikis_param else None
    direkt_ucus = request.args.get("direkt", "") == "1"
    MIN_INDIRIM = 10  # %10'dan düşük indirimleri gösterme

    MIN_TOPLAM = 30
    MIN_YURTICI = 10
    MIN_YURTDISI = 20

    conn = sqlite3.connect(DB)
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT f.*,
                CASE WHEN f.olusturulma > datetime('now', '-24 hours') THEN 1 ELSE 0 END AS yeni
            FROM firsatlar f
            INNER JOIN (
                SELECT varis, cikis, MIN(fiyat) as min_fiyat
                FROM firsatlar
                WHERE (aktif = 1 OR aktif IS NULL)
                AND (ucus_tarihi >= date('now') OR ucus_tarihi IS NULL)
                GROUP BY varis, cikis
            ) g ON f.varis = g.varis AND f.cikis = g.cikis AND f.fiyat = g.min_fiyat
            WHERE (f.aktif = 1 OR f.aktif IS NULL)
            AND (f.ucus_tarihi >= date('now') OR f.ucus_tarihi IS NULL)
            GROUP BY f.varis, f.cikis
            ORDER BY f.fiyat ASC
        """).fetchall()

        tumu = [dict(r) for r in rows]

        if len(tumu) < MIN_TOPLAM * 3:
            pasif_rows = conn.execute("""
                SELECT *, 0 AS yeni FROM firsatlar
                WHERE aktif = 0
                AND (ucus_tarihi >= date('now') OR ucus_tarihi IS NULL)
                ORDER BY olusturulma DESC, fiyat ASC LIMIT 500
            """).fetchall()
            gorulmus = {(d["varis"], d["cikis"]) for d in tumu}
            for r in pasif_rows:
                d = dict(r)
                if (d["varis"], d["cikis"]) not in gorulmus:
                    tumu.append(d)
    finally:
        conn.close()

    # Minimum indirim filtresi
    tumu = [d for d in tumu if (d.get("indirim_orani") or 0) >= MIN_INDIRIM]

    # Çıkış filtresi uygula
    if cikis_filtre:
        tumu = [d for d in tumu if d.get("cikis") in cikis_filtre]

    # Direkt uçuş filtresi
    if direkt_ucus:
        tumu = [d for d in tumu if (d.get("aktarma") or 0) == 0]

    # Varış bazında grupla — her varış için en ucuz fırsatı ana, diğerlerini ek kalkış olarak göster
    varis_gruplari = {}
    for d in tumu:
        varis = d.get("varis", "")
        cikis = d.get("cikis", "")
        fiyat = d.get("fiyat", 0)
        if varis not in varis_gruplari:
            varis_gruplari[varis] = {"ana": d, "diger": []}
        else:
            grup = varis_gruplari[varis]
            mevcut_cikislar = {grup["ana"]["cikis"]} | {x["cikis"] for x in grup["diger"]}
            if cikis in mevcut_cikislar:
                continue
            if fiyat < grup["ana"]["fiyat"]:
                eski = grup["ana"]
                grup["diger"].append({
                    "cikis": eski["cikis"],
                    "cikis_sehir": SEHIR_ADLARI.get(eski["cikis"], eski["cikis"]),
                    "fiyat": eski["fiyat"],
                })
                grup["ana"] = d
            else:
                grup["diger"].append({
                    "cikis": cikis,
                    "cikis_sehir": SEHIR_ADLARI.get(cikis, cikis),
                    "fiyat": fiyat,
                })

    # Grupları yurtiçi / yurtdışı olarak ayır
    gruplar = sorted(varis_gruplari.values(), key=lambda g: -(g["ana"].get("indirim_orani") or 0))
    yurtici_gruplar = [g for g in gruplar if g["ana"].get("varis", "") in YURTICI]
    yurtdisi_gruplar = [g for g in gruplar if g["ana"].get("varis", "") not in YURTICI]

    # Toplam fırsat az ise ülke limitlerini esnet
    esnek = len(gruplar) < MIN_TOPLAM
    maks_yurtici_limit = 999 if esnek else MAKS_YURTICI
    maks_ulke_limit = 999 if esnek else MAKS_ULKE

    def gruptan_firsat(g):
        d = g["ana"]
        d["cikis_sehir"] = SEHIR_ADLARI.get(d.get("cikis", ""), d.get("cikis", ""))
        diger = sorted(g["diger"], key=lambda x: x["fiyat"])[:3]
        d["diger_cikislar"] = diger
        return d

    # Yurtiçi: minimum MIN_YURTICI garanti
    yurtici_sonuc = [gruptan_firsat(g) for g in yurtici_gruplar[:max(MIN_YURTICI, maks_yurtici_limit)]]

    # Yurtdışı: ülke çeşitliliği filtresiyle
    ulke_sayac = {}
    yurtdisi_sonuc = []
    for g in yurtdisi_gruplar:
        d = g["ana"]
        ulke = ULKE_ADLARI.get(d.get("varis", ""), d.get("varis", ""))
        ulke_sayac[ulke] = ulke_sayac.get(ulke, 0) + 1
        if ulke_sayac[ulke] > maks_ulke_limit:
            continue
        yurtdisi_sonuc.append(gruptan_firsat(g))
        if len(yurtdisi_sonuc) >= 40:
            break

    # Birleştir
    sonuc = yurtici_sonuc + yurtdisi_sonuc

    # Sıralama: önce yeni, sonra direkt uçuşlar, sonra popüler, sonra indirim oranı
    sonuc.sort(key=lambda d: (
        0 if d.get("yeni") else 1,
        0 if (d.get("aktarma") or 0) == 0 else 1,
        0 if d.get("varis") in POPULER else 1,
        -(d.get("indirim_orani") or 0),
    ))

    return jsonify(sonuc[:50])

@bp.route("/api/firsatlar/<int:firsat_id>", methods=["GET"])
def firsat_detay(firsat_id):
    conn = sqlite3.connect(DB)
    try:
        conn.row_factory = sqlite3.Row
        firsat = conn.execute(
            "SELECT * FROM firsatlar WHERE id=?", (firsat_id,)
        ).fetchone()
        paket = conn.execute(
            "SELECT * FROM paketler WHERE firsat_id=?", (firsat_id,)
        ).fetchone()
    finally:
        conn.close()
    if not firsat:
        return jsonify({"hata": "Bulunamadı"}), 404
    return jsonify({
        "firsat": dict(firsat),
        "paket": json.loads(paket["icerik"]) if paket and paket["icerik"] else None
    })


@bp.route("/api/firsatlar/<int:firsat_id>/alternatifler", methods=["GET"])
def alternatif_tarihler(firsat_id):
    conn = sqlite3.connect(DB)
    try:
        conn.row_factory = sqlite3.Row
        firsat = conn.execute(
            "SELECT cikis, varis, ucus_tarihi, donus_tarihi, fiyat FROM firsatlar WHERE id=?",
            (firsat_id,)
        ).fetchone()
        if not firsat:
            return jsonify([])

        origin = firsat["cikis"]
        dest = firsat["varis"]
        mevcut_tarih = firsat["ucus_tarihi"] or ""

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
    finally:
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
    try:
        conn.row_factory = sqlite3.Row
        firsat = conn.execute(
            "SELECT id, cikis, varis, fiyat FROM firsatlar WHERE id=?", (firsat_id,)
        ).fetchone()
        if not firsat:
            return jsonify([])

        fiyat = firsat["fiyat"] or 0
        fiyat_min = max(fiyat - 1500, 0)
        fiyat_max = fiyat + 1500
        yurtici = firsat["varis"] in YURTICI

        rows = conn.execute("""
            SELECT * FROM firsatlar
            WHERE id != ?
            AND fiyat BETWEEN ? AND ?
            AND (aktif = 1 OR aktif IS NULL)
            AND (gecerlilik > datetime('now') OR gecerlilik IS NULL)
            ORDER BY indirim_orani DESC
            LIMIT 50
        """, (firsat_id, fiyat_min, fiyat_max)).fetchall()
    finally:
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
    try:
        conn.row_factory = sqlite3.Row
        firsat = conn.execute("SELECT * FROM firsatlar WHERE id=?", (firsat_id,)).fetchone()
        if not firsat:
            return jsonify({"hata": "Fırsat bulunamadı"}), 404

        paket = conn.execute(
            "SELECT * FROM paketler WHERE firsat_id=?", (firsat_id,)
        ).fetchone()
        if paket and paket["icerik"]:
            icerik = json.loads(paket["icerik"])
            return jsonify({"paket": icerik, "kaynak": "cache"})
    finally:
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
