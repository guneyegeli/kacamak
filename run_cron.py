import os, sys, logging
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

# Loglama ayarı — her adımı terminale yaz
logging.basicConfig(
    level=logging.DEBUG if os.getenv("DEBUG") else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)

from agents.ucus_tarayici import cron_tarama
import sqlite3

# 7 günden eski fırsatları pasife çek
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
try:
    conn = sqlite3.connect(DB)
    pasif = conn.execute("""
        UPDATE firsatlar SET aktif = 0
        WHERE aktif = 1 AND olusturulma < datetime('now', '-7 days')
    """)
    pasif_sayi = pasif.rowcount
    conn.commit()
    conn.close()
    if pasif_sayi > 0:
        logging.info("%d eski fırsat pasife alındı (7 gün+)", pasif_sayi)
except Exception as e:
    logging.warning("Eski fırsat pasife alma hatası: %s", e)

sonuc = cron_tarama()

print("\n" + "=" * 50)
print(f"  SONUÇ: {sonuc['rota']} rota tarandi, "
      f"{sonuc['fiyat_kaydedilen']} fiyat kaydedildi, "
      f"{sonuc['firsat']} firsat bulundu")
print("=" * 50)
