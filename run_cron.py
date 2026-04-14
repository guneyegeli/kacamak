import os, sys, logging, fcntl
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

# Çakışma koruması — aynı anda sadece bir cron çalışsın
lock_file = open('/tmp/kacamak_cron.lock', 'w')
try:
    fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
except IOError:
    logging.warning("Cron zaten çalışıyor, atlanıyor")
    sys.exit(0)

# Loglama ayarı
logging.basicConfig(
    level=logging.DEBUG if os.getenv("DEBUG") else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("cron")

from agents.ucus_tarayici import cron_tarama
import sqlite3

# 7 günden eski fırsatları pasife çek
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
conn = sqlite3.connect(DB)
try:
    pasif = conn.execute("""
        UPDATE firsatlar SET aktif = 0
        WHERE aktif = 1 AND olusturulma < datetime('now', '-7 days')
    """)
    pasif_sayi = pasif.rowcount
    conn.commit()
    if pasif_sayi > 0:
        log.info("%d eski fırsat pasife alındı (7 gün+)", pasif_sayi)
except Exception as e:
    log.warning("Eski fırsat pasife alma hatası: %s", e)
finally:
    conn.close()

sonuc = cron_tarama()

log.info("=" * 50)
log.info("SONUÇ: %d rota tarandi, %d fiyat kaydedildi, %d firsat bulundu",
         sonuc['rota'], sonuc['fiyat_kaydedilen'], sonuc['firsat'])
log.info("=" * 50)

# Otel verisi olmayan fırsatları güncelle
try:
    from services.otel_eslestirici import mevcut_firsatlari_guncelle
    otel_guncellenen = mevcut_firsatlari_guncelle(limit=30)
    log.info("Otel güncelleme: %d fırsat işlendi", otel_guncellenen)
except Exception as e:
    log.warning("Otel güncelleme hatası: %s", e)
