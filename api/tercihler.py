from flask import Blueprint, request, jsonify
import sqlite3, json, os
from services.eslestirici import tercih_profili_olustur

bp = Blueprint("tercihler", __name__)
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")

@bp.route("/api/tercihler/<int:kullanici_id>", methods=["GET"])
def tercih_getir(kullanici_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM tercihler WHERE kullanici_id=? AND aktif=1",
        (kullanici_id,)
    ).fetchall()
    paket = conn.execute(
        "SELECT * FROM paket_tercihleri WHERE kullanici_id=?",
        (kullanici_id,)
    ).fetchone()
    conn.close()
    if not rows:
        return jsonify({"ilk_giris": True})
    r = rows[0]
    return jsonify({
        "ilk_giris": False,
        "tercihler": {
            "cikis_havalimanlari": [row["cikis_havaalani"] for row in rows],
            "maks_butce": r["maks_butce"],
            "min_indirim_orani": r["min_indirim_orani"],
            "yetiskin_sayisi": r["yetiskin_sayisi"],
            "cocuk_var": bool(r["cocuk_var"]),
            "esnek_tarih": bool(r["esnek_tarih"]),
            "direkt_ucus": bool(r["direkt_ucus"]),
            "otel_yildiz": r["otel_yildiz"],
            "otel_yildizlar": json.loads(r["otel_yildizlar"] or "[3,4]"),
            "otel_butce": r["otel_butce"] or 2000,
            "otel_konum": r["otel_konum"] or "farketmez",
            "kahvalti_dahil": bool(r["kahvalti_dahil"]),
            "min_gece": r["min_gece"],
            "max_gece": r["max_gece"],
            "tercih_tipleri": json.loads(r["tercih_tipleri"] or "[]"),
            "paket": dict(paket) if paket else {}
        }
    })

@bp.route("/api/tercihler/<int:kullanici_id>", methods=["PUT"])
def tercih_guncelle(kullanici_id):
    data = request.json
    try:
        tercih_profili_olustur(kullanici_id, data)
        p = data.get("paket", {})
        conn = sqlite3.connect(DB)
        conn.execute("""
            INSERT OR REPLACE INTO paket_tercihleri
            (kullanici_id,ucus,otel,etkinlik,restoran,tur,arac_kiralama,sigorta)
            VALUES (?,?,?,?,?,?,?,?)
        """, (
            kullanici_id,
            int(p.get("ucus", True)), int(p.get("otel", True)),
            int(p.get("etkinlik", True)), int(p.get("restoran", True)),
            int(p.get("tur", True)), int(p.get("arac_kiralama", False)),
            int(p.get("sigorta", False))
        ))
        conn.commit()
        conn.close()
        return jsonify({"basarili": True})
    except Exception as e:
        return jsonify({"hata": str(e)}), 500
