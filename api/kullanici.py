from flask import Blueprint, request, jsonify
import sqlite3, os

bp = Blueprint("kullanici", __name__)
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")

@bp.route("/api/kayit", methods=["POST"])
def kayit():
    d = request.json
    if not d or not d.get("email"):
        return jsonify({"hata": "Email gerekli"}), 400
    email = d["email"].strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"hata": "Geçersiz email formatı"}), 400
    conn = sqlite3.connect(DB)
    try:
        cur = conn.execute(
            "INSERT INTO kullanicilar (email, ad, fcm_token) VALUES (?,?,?)",
            (d["email"], d.get("ad",""), d.get("fcm_token"))
        )
        conn.commit()
        return jsonify({"id": cur.lastrowid, "basarili": True})
    except Exception as e:
        return jsonify({"hata": str(e)}), 400
    finally:
        conn.close()

@bp.route("/api/fcm-token", methods=["PUT"])
def fcm_guncelle():
    d = request.json
    if not d or not d.get("fcm_token") or not d.get("kullanici_id"):
        return jsonify({"hata": "Geçersiz istek"}), 400
    conn = sqlite3.connect(DB)
    try:
        conn.execute(
            "UPDATE kullanicilar SET fcm_token=? WHERE id=?",
            (d["fcm_token"], d["kullanici_id"])
        )
        conn.commit()
        return jsonify({"basarili": True})
    finally:
        conn.close()
