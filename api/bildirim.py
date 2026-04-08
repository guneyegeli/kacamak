from flask import Blueprint, request, jsonify
from services.firebase_service import bildirim_gonder
import sqlite3
import os

bp = Blueprint("bildirim", __name__)
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")


@bp.route("/api/bildirim/test", methods=["POST"])
def test_bildirim():
    """Test bildirimi gonder. Body: {"kullanici_id": 1} veya {"fcm_token": "..."}"""
    d = request.json
    if not d:
        return jsonify({"hata": "Geçersiz istek"}), 400
    fcm_token = d.get("fcm_token")

    if not fcm_token and d.get("kullanici_id"):
        conn = sqlite3.connect(DB)
        try:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT fcm_token FROM kullanicilar WHERE id=?",
                (d["kullanici_id"],)
            ).fetchone()
            if row:
                fcm_token = row["fcm_token"]
        finally:
            conn.close()

    if not fcm_token:
        return jsonify({"hata": "FCM token bulunamadi"}), 400

    basarili = bildirim_gonder(
        fcm_token,
        "Kacamak Test",
        "Bildirimler calisiyor!",
        {"tip": "test"}
    )
    return jsonify({"basarili": basarili})
