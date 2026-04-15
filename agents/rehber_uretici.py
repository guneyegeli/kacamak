"""
Aktif fırsatların varış şehirleri için Claude API ile
SEO destekli seyahat rehberleri üretir.
"""

import os
import sys
import json
import time
import sqlite3
import logging
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from services.claude_service import claude_sor

DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
REHBER_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "rehberler")
log = logging.getLogger("rehber_uretici")

# IATA → şehir adı (FirsatDetay'dakiyle aynı)
SEHIR_ADLARI = {
    'IST':'İstanbul','SAW':'İstanbul','ADB':'İzmir','AYT':'Antalya','ESB':'Ankara',
    'BCN':'Barselona','MAD':'Madrid','PAR':'Paris','CDG':'Paris','ORY':'Paris',
    'LHR':'Londra','LON':'Londra','BER':'Berlin','MUC':'Münih','FRA':'Frankfurt',
    'ROM':'Roma','FCO':'Roma','MXP':'Milano','AMS':'Amsterdam','PRG':'Prag',
    'BUD':'Budapeşte','VIE':'Viyana','ATH':'Atina','LIS':'Lizbon','WAW':'Varşova',
    'ZAG':'Zagreb','BEG':'Belgrad','SOF':'Sofya','OTP':'Bükreş','SKP':'Üsküp',
    'TIA':'Tiran','SJJ':'Saraybosna','TGD':'Podgorica','PRN':'Priştine',
    'DUB':'Dublin','CPH':'Kopenhag','OSL':'Oslo','ARN':'Stockholm','HEL':'Helsinki',
    'ZRH':'Zürih','BRU':'Brüksel','BTS':'Bratislava',
    'TBS':'Tiflis','GYD':'Bakü','BAK':'Bakü','EVN':'Erivan',
    'TLV':'Tel Aviv','AMM':'Amman','BEY':'Beyrut',
    'DXB':'Dubai','DOH':'Doha','RUH':'Riyad','JED':'Cidde',
    'CAI':'Kahire','SSH':'Şarm El Şeyh','HRG':'Hurghada',
    'CMN':'Kazablanka','RAK':'Marakeş','TUN':'Tunus',
    'MOW':'Moskova','SVO':'Moskova','LED':'St. Petersburg',
    'TAS':'Taşkent','ALA':'Almatı','NQZ':'Nur-Sultan',
    'BKK':'Bangkok','HKT':'Phuket','SIN':'Singapur','KUL':'Kuala Lumpur',
    'HND':'Tokyo','NRT':'Tokyo','ICN':'Seul',
    'HKG':'Hong Kong','PEK':'Pekin','PVG':'Şangay',
    'DPS':'Bali','MNL':'Manila','MLE':'Maldivler',
    'JFK':'New York','LAX':'Los Angeles','MIA':'Miami',
    'YYZ':'Toronto','MEX':'Mexico City','CUN':'Cancún',
    'GRU':'São Paulo','GIG':'Rio de Janeiro','EZE':'Buenos Aires','BOG':'Bogota',
    'LIM':'Lima','SCL':'Santiago',
    'SYD':'Sidney','MEL':'Melbourne','AKL':'Auckland',
    'CPT':'Cape Town','NBO':'Nairobi','MRU':'Mauritius','SEZ':'Seyşeller',
    'KRR':'Krasnodar','AER':'Soçi',
}


def rehber_uret(iata, sehir_adi):
    """Tek şehir için Claude ile rehber üret."""
    prompt = f"""{sehir_adi} için kapsamlı bir Türkçe seyahat rehberi yaz.
Şunları içermeli:
- Şehir hakkında kısa tanıtım (2-3 paragraf)
- Mutlaka görülmesi gereken 5 yer (her biri: isim, açıklama, ipucu)
- Yerel yemek önerileri (5 yemek: isim, açıklama)
- Pratik seyahat ipuçları (ulaşım, para, dil, güvenlik)
- En iyi ziyaret zamanı
- Tahmini günlük bütçe (ekonomik/orta/lüks — EUR cinsinden)
- SEO için 160 karakterlik meta açıklaması

JSON formatında döndür:
{{
  "sehir": "{sehir_adi}",
  "ulke": "...",
  "tanitim": "...",
  "gezilecek_yerler": [
    {{"isim": "...", "aciklama": "...", "ipucu": "..."}},
    ...
  ],
  "yemekler": [
    {{"isim": "...", "aciklama": "..."}},
    ...
  ],
  "ipuclari": {{
    "ulasim": "...",
    "para": "...",
    "dil": "...",
    "guvenlik": "..."
  }},
  "en_iyi_zaman": "...",
  "butce": {{"ekonomik": "...", "orta": "...", "luks": "..."}},
  "meta_description": "... (max 160 karakter)"
}}"""

    sonuc = claude_sor(prompt, json_mod=True, max_tokens=4000)
    if not sonuc or not isinstance(sonuc, dict) or 'sehir' not in sonuc:
        log.warning("Rehber üretilemedi: %s (%s)", sehir_adi, iata)
        return None

    sonuc['iata'] = iata
    sonuc['olusturulma'] = datetime.now().isoformat()
    return sonuc


def rehberleri_guncelle(limit=10):
    """DB'deki aktif fırsatların varış şehirleri için rehber üret."""
    os.makedirs(REHBER_DIR, exist_ok=True)

    conn = sqlite3.connect(DB)
    try:
        rows = conn.execute("""
            SELECT DISTINCT varis, varis_sehir FROM firsatlar
            WHERE aktif = 1 AND ucus_tarihi >= date('now')
            ORDER BY olusturulma DESC
        """).fetchall()
    finally:
        conn.close()

    # Benzersiz IATA kodları
    sehirler = {}
    for varis, varis_sehir in rows:
        if varis not in sehirler:
            sehir_adi = varis_sehir or SEHIR_ADLARI.get(varis, varis)
            sehirler[varis] = sehir_adi

    uretilen = 0
    atlanan = 0
    esik = datetime.now() - timedelta(days=30)

    for iata, sehir_adi in list(sehirler.items())[:limit]:
        dosya = os.path.join(REHBER_DIR, f"{iata}.json")

        # Zaten varsa ve 30 günden yeni ise atla
        if os.path.exists(dosya):
            try:
                with open(dosya, 'r', encoding='utf-8') as f:
                    mevcut = json.load(f)
                olusturulma = datetime.fromisoformat(mevcut.get('olusturulma', '2000-01-01'))
                if olusturulma > esik:
                    atlanan += 1
                    continue
            except Exception:
                pass

        log.info("Rehber üretiliyor: %s (%s)", sehir_adi, iata)
        rehber = rehber_uret(iata, sehir_adi)
        if rehber:
            with open(dosya, 'w', encoding='utf-8') as f:
                json.dump(rehber, f, ensure_ascii=False, indent=2)
            uretilen += 1
            log.info("Rehber kaydedildi: %s", dosya)
        else:
            log.warning("Rehber üretilemedi: %s", iata)

        time.sleep(3)

    log.info("Rehber güncelleme: %d üretildi, %d atlandı (güncel)", uretilen, atlanan)
    return {"uretilen": uretilen, "atlanan": atlanan}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    rehberleri_guncelle(limit=10)
