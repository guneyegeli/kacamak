from flask import Blueprint, jsonify
import sqlite3, json, os

bp = Blueprint("paketler", __name__)
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")

@bp.route("/api/paketler/<int:kullanici_id>", methods=["GET"])
def kullanici_paketleri(kullanici_id):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT p.*, f.cikis, f.varis, f.fiyat, f.indirim_orani,
               f.ucus_tarihi, f.donus_tarihi
        FROM paketler p
        JOIN firsatlar f ON f.id = p.firsat_id
        WHERE p.kullanici_id=?
        ORDER BY p.olusturulma DESC
        LIMIT 20
    """, (kullanici_id,)).fetchall()
    conn.close()
    sonuc = []
    for r in rows:
        d = dict(r)
        d["icerik"] = json.loads(d["icerik"]) if d.get("icerik") else {}
        sonuc.append(d)
    return jsonify(sonuc)
