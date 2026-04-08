"""Device ID → DB kullanici_id çözümleme.
Frontend UUID string gönderir, backend integer ID bekler.
Bu modül aradaki köprüyü kurar ve gerekirse kullanıcıyı otomatik oluşturur.
"""
import sqlite3
import os

DB = os.getenv("DATABASE_PATH", "data/kacamak.db")


def device_id_coz(device_id: str) -> int:
    """Device ID'den integer kullanici_id döndürür. Yoksa oluşturur."""
    # Zaten integer ise direkt kullan
    try:
        return int(device_id)
    except (ValueError, TypeError):
        pass

    conn = sqlite3.connect(DB)
    try:
        # device_id ile kayıtlı kullanıcı var mı?
        row = conn.execute(
            "SELECT id FROM kullanicilar WHERE email=?",
            (f"{device_id}@device.local",)
        ).fetchone()
        if row:
            return row[0]

        # Yoksa otomatik oluştur
        cur = conn.execute(
            "INSERT INTO kullanicilar (email, ad) VALUES (?,?)",
            (f"{device_id}@device.local", "")
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()
