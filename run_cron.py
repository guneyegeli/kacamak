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

sonuc = cron_tarama()

print("\n" + "=" * 50)
print(f"  SONUÇ: {sonuc['rota']} rota tarandi, "
      f"{sonuc['fiyat_kaydedilen']} fiyat kaydedildi, "
      f"{sonuc['firsat']} firsat bulundu")
print("=" * 50)
