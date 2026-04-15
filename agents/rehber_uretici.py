"""
Aktif fırsatların varış şehirleri için Claude API ile
SEO destekli seyahat rehberleri üretir.

Öncelik sırası:
1. DB'deki aktif fırsatlardaki şehirler
2. Popüler destinasyonlar (hardcoded)
3. Diğer şehirler

Günlük limit: varsayılan 3 (Claude API maliyeti kontrolü)
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

# Popüler destinasyonlar — fırsat olmasa da rehber üretilmeli
POPULER = [
    'ATH', 'BCN', 'DXB', 'ROM', 'PAR', 'LON', 'AMS', 'PRG', 'BUD', 'LIS',
    'BER', 'VIE', 'BKK', 'TBS', 'BEG', 'RAK', 'DPS', 'ICN', 'HND', 'SIN',
    'GYD', 'MLE', 'SSH', 'HKT', 'CPH', 'MUC', 'MXP', 'MAD', 'ZRH', 'BRU',
]


def kelime_say(data):
    """JSON rehber verisindeki toplam kelime sayısını tahmin et."""
    text = json.dumps(data, ensure_ascii=False)
    return len(text.split())


def rehber_durumu(iata):
    """Rehber dosyasının durumunu kontrol et.
    Döner: ('yok', None) | ('eski', gun_sayisi) | ('guncel', gun_sayisi)
    """
    dosya = os.path.join(REHBER_DIR, f"{iata}.json")
    if not os.path.exists(dosya):
        return 'yok', None

    try:
        with open(dosya, 'r', encoding='utf-8') as f:
            mevcut = json.load(f)
        olusturulma = datetime.fromisoformat(mevcut.get('olusturulma', '2000-01-01'))
        gun = (datetime.now() - olusturulma).days
        if gun > 30:
            return 'eski', gun
        return 'guncel', gun
    except Exception:
        return 'yok', None


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


def rehberleri_guncelle(limit=3):
    """Öncelik sırasına göre rehber üret/güncelle. Günlük limit varsayılan 3."""
    os.makedirs(REHBER_DIR, exist_ok=True)

    # --- 1. DB'deki aktif fırsatlardan şehir listesi ---
    db_sehirler = {}
    try:
        conn = sqlite3.connect(DB)
        rows = conn.execute("""
            SELECT DISTINCT varis, varis_sehir FROM firsatlar
            WHERE aktif = 1 AND ucus_tarihi >= date('now')
            ORDER BY olusturulma DESC
        """).fetchall()
        conn.close()
        for varis, varis_sehir in rows:
            if varis not in db_sehirler:
                db_sehirler[varis] = varis_sehir or SEHIR_ADLARI.get(varis, varis)
    except Exception as e:
        log.warning("DB okunamadı: %s", e)

    # --- 2. Öncelikli kuyruk oluştur ---
    # Sıra: DB şehirleri → popüler → SEHIR_ADLARI'ndaki geri kalanlar
    kuyruk = []
    eklenen = set()

    # Öncelik 1: aktif fırsatlardaki şehirler
    for iata, sehir in db_sehirler.items():
        if iata not in eklenen:
            kuyruk.append((iata, sehir))
            eklenen.add(iata)

    # Öncelik 2: popüler destinasyonlar
    for iata in POPULER:
        if iata not in eklenen and iata in SEHIR_ADLARI:
            kuyruk.append((iata, SEHIR_ADLARI[iata]))
            eklenen.add(iata)

    # Öncelik 3: diğer tüm şehirler
    for iata, sehir in SEHIR_ADLARI.items():
        if iata not in eklenen:
            kuyruk.append((iata, sehir))
            eklenen.add(iata)

    # --- 3. Üretim / güncelleme döngüsü ---
    uretilen = 0
    atlanan = 0
    toplam_kalan = 0

    for iata, sehir_adi in kuyruk:
        durum, gun = rehber_durumu(iata)

        if durum == 'guncel':
            atlanan += 1
            log.debug("Atlandı: %s (%s) - %d gün önce güncellendi", sehir_adi, iata, gun)
            continue

        # Üretilmesi gereken ama limite takılan
        if uretilen >= limit:
            toplam_kalan += 1
            continue

        if durum == 'eski':
            log.info("Güncelleniyor: %s (%s) - %d gün önce üretilmişti", sehir_adi, iata, gun)
        else:
            log.info("Rehber üretiliyor: %s (%s)", sehir_adi, iata)

        rehber = rehber_uret(iata, sehir_adi)
        if rehber:
            dosya = os.path.join(REHBER_DIR, f"{iata}.json")
            with open(dosya, 'w', encoding='utf-8') as f:
                json.dump(rehber, f, ensure_ascii=False, indent=2)
            kelime = kelime_say(rehber)
            uretilen += 1
            log.info("Rehber üretildi: %s (%s) - %d kelime", sehir_adi, iata, kelime)
        else:
            log.warning("Rehber üretilemedi: %s (%s)", sehir_adi, iata)

        time.sleep(3)

    # Kalan sayısını hesapla (limite takılanlar)
    for iata, _ in kuyruk:
        if uretilen >= limit:
            d, _ = rehber_durumu(iata)
            if d != 'guncel':
                pass  # zaten toplam_kalan'a eklendi

    log.info("=" * 40)
    log.info("Bugün %d rehber üretildi, %d atlandı (güncel), %d şehir kaldı",
             uretilen, atlanan, toplam_kalan)
    log.info("=" * 40)

    return {"uretilen": uretilen, "atlanan": atlanan, "kalan": toplam_kalan}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    rehberleri_guncelle(limit=3)
