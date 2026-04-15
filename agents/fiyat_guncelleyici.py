"""
Aktif fırsatların fiyatlarını Travelpayouts API'den güncelleyen agent.
DB'deki fiyattan %5'ten fazla farklıysa günceller.
"""

import os
import sys
import time
import sqlite3
import requests
import logging
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

TOKEN = os.getenv("TRAVELPAYOUTS_TOKEN")
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
BASE = "https://api.travelpayouts.com"
log = logging.getLogger("fiyat_guncelleyici")


def guncel_fiyat_cek(cikis, varis, ucus_tarihi, donus_tarihi):
    """Travelpayouts'tan tek rota için güncel fiyat çeker (TRY)."""
    params = {
        "origin": cikis,
        "destination": varis,
        "currency": "try",
        "depart_date": ucus_tarihi,
        "token": TOKEN,
    }
    if donus_tarihi:
        params["return_date"] = donus_tarihi

    try:
        r = requests.get(f"{BASE}/v2/prices/latest", params=params, timeout=10)
        if not r.ok:
            return None
        data = r.json().get("data", [])
        if isinstance(data, list):
            for ucus in data:
                if ucus.get("destination") == varis:
                    return ucus.get("value")
        elif isinstance(data, dict):
            for _, ucus in data.items():
                if isinstance(ucus, dict):
                    return ucus.get("value") or ucus.get("price")
    except Exception as e:
        log.debug("API hatası %s→%s: %s", cikis, varis, e)
    return None


def fiyat_guncelle():
    """Aktif fırsatların fiyatlarını günceller."""
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    try:
        firsatlar = conn.execute("""
            SELECT id, cikis, varis, ucus_tarihi, donus_tarihi, fiyat
            FROM firsatlar
            WHERE aktif = 1 AND ucus_tarihi >= date('now')
            ORDER BY olusturulma DESC
            LIMIT 100
        """).fetchall()

        guncellenen = 0
        kontrol = 0

        for f in firsatlar:
            kontrol += 1
            yeni_fiyat = guncel_fiyat_cek(f["cikis"], f["varis"], f["ucus_tarihi"], f["donus_tarihi"])

            if yeni_fiyat and f["fiyat"]:
                fark_oran = abs(yeni_fiyat - f["fiyat"]) / f["fiyat"]
                if fark_oran > 0.05:
                    conn.execute(
                        "UPDATE firsatlar SET fiyat = ?, guncelleme = datetime('now') WHERE id = ?",
                        (yeni_fiyat, f["id"]),
                    )
                    conn.commit()
                    guncellenen += 1
                    log.info("Güncellendi: %s→%s %d → %d ₺",
                             f["cikis"], f["varis"], f["fiyat"], yeni_fiyat)

            time.sleep(1)

        log.info("Fiyat güncelleme: %d kontrol, %d güncellendi", kontrol, guncellenen)
        return {"kontrol": kontrol, "guncellenen": guncellenen}
    finally:
        conn.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    fiyat_guncelle()
