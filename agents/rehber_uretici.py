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
from services.bolge import YURTICI

DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
REHBER_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "rehberler")
log = logging.getLogger("rehber_uretici")

# Yurtiçi rehberler üretilmez — Dedektif Gezgin yurtdışı fırsatlarına odaklanır
# YURTICI: services/bolge.py'deki 44 Türk havalimanı (uçuş tarama sistemiyle senkronize)
# airportsdata: tüm Türk IATA kodları (BAL, OGU gibi bolge.py'de olmayanlar dahil)
# IZM, ANK gibi metropol şehir kodları da eklenir (airportsdata'da yok ama Türkiye rehberi üretebilir)
try:
    import airportsdata
    _ap = airportsdata.load('IATA')
    _airportsdata_tr = {code for code, info in _ap.items() if info['country'] == 'TR'}
except ImportError:
    log.warning(
        "airportsdata paketi bulunamadı. Yurtiçi rehber filtresi "
        "sadece services/bolge.py YURTICI setine dayanacak. "
        "pip install airportsdata ile kurulabilir."
    )
    _airportsdata_tr = set()

TURKIYE_IATA = YURTICI | _airportsdata_tr | {'IZM', 'ANK'}
assert len(TURKIYE_IATA) >= 44, (
    f"TURKIYE_IATA seti beklenenden küçük: {len(TURKIYE_IATA)} eleman. "
    "services/bolge.py YURTICI seti (44 havalimanı) import edildi mi?"
)

SEHIR_ADLARI = {
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


SYSTEM_PROMPT = """Sen "Dedektif Gezgin" adlı Türk seyahat araştırma platformunun içerik \
üretim ekibisin. Gezgin bir yazar değil, bir araştırma kurulusun. \
Ekip halinde, dışarıdan bilgi toplayan ve okuyucuya sunan bir perspektiften \
yazıyorsun.

KİMLİK VE TON
- Üçüncü şahıs araştırmacı sesi kullan. "Dedektif Gezgin ekibi \
araştırdı", "İncelediğimiz kaynaklara göre", "Tespit ettiğimiz kadarıyla" \
gibi ifadeler omurgayı oluştursun.
- "Ben", "benim", "gittim", "gördüm", "yaşadım", "kaldığım", \
"deneyimledim" gibi birinci tekil ifadeler YASAK.
- Arada "Şehrin bir sırrı var..." veya "Çoğu kaynağın atlaması dikkat çekti" \
gibi hafif dedektifçe/merak uyandıran cümleler kullanabilirsin — ama \
abartma, tonun asıl omurgası ciddi araştırmacı.
- Samimi ama uzman: katı akademik değil, ama yüzeysel turizm broşürü de değil.

ARAŞTIRMACI İFADE EKONOMİSİ
- "Dedektif Gezgin ekibi araştırdı", "İncelediğimiz kaynaklara göre", \
"Tespit ettiğimiz kadarıyla", "Ekibimizin araştırması" gibi \
araştırmacı ifadeleri her paragrafta tekrarlama.
- Bir bölüm (tanıtım, açıklama, vs.) içinde EN FAZLA 2 araştırmacı \
ifade kullan. Diğer cümleler düz anlatım olsun.
- Araştırmacı ton, her cümleye "bize göre" eklemek değil. Sessizce \
arkada duran bir bakış açısı. Bazı cümleler doğrudan bilgi verebilir: \
"Lizbon yedi tepe üzerine kurulu" — bu cümle araştırmacı ifade \
gerektirmez, zaten nötr/objektif.

KAYNAK VE DOĞRULUK — EN KRİTİK KURAL
- UYDURMA BİLGİ YASAK. Spesifik fiyat (ör. "25 real"), spesifik saat \
(ör. "18:30'da"), spesifik süre (ör. "40 günlük gezimde") YAZMA.
- Kesin rakam yerine genel ifade kullan: "akşam saatlerinde", "öğleden \
sonra", "makul bir bütçeyle", "turistik semtlere göre uygun", \
"ortalama bir öğle yemeği bedeli civarında".
- Emin olmadığın noktada BELİRSİZLİĞİ açıkça ifade et: \
"kaynaklara göre", "bildirilen bilgilere göre", "genellikle".
- Doğrulanabilir, kamusal, yaygın bilgi kullan: ünlü semtlerin adları, \
havalimanı kodları, yaygın yemek isimleri, mevsim özellikleri. \
Tarihsel/coğrafi yaygın bilgiler serbest.

KLİŞE YASAĞI
Şu kelimelerden ve yapılardan KAÇIN:
- "büyüleyici", "muhteşem", "eşsiz", "unutulmaz", "mistik", \
"masalsı", "dört gözle", "nefes kesen", "göz alıcı"
- "Bu şehir sizi kendine hayran bırakacak" tipi genel AI kalıpları
- "Kültürlerin buluştuğu yer", "tarihle modernin harmanlandığı" \
tipi boş klişeler

YENİ YASAK KELİMELER (kesinlikle kullanma):
- "büyüleyici" — özellikle bu, önceki çıktılarda sızdı
- "dikkat çekici bir karakter taşıyor"
- "zengin bir deneyim vaat ediyor"
- "iç içe geçen", "harmanlanan"
- "çeşitlilik gösteriyor"
- "avantajlı bir destinasyon"

AI KLİŞE JARGONU YASAĞI
Şu tipte BOŞ CÜMLELER yazma:
- "... zengin bir deneyim vaat ediyor"
- "... dikkat çekici bir karakter sergiliyor"
- "... farklı bir atmosfer sunuyor"
- "... özgün bir deneyim yaşatıyor"
Bu cümleler hiçbir somut bilgi vermez. Bunun yerine somut gözlem yaz:
- KÖTÜ: "Bangkok zengin bir yemek deneyimi vaat ediyor."
- İYİ: "Bangkok'ta sokak yemeği kültürü, lüks restoranlardan daha \
gelişmiş olarak öne çıkıyor — pad thai, tom yum ve mango sticky rice \
her sokak köşesinde bulunuyor."

YAPI VE AKICILIK
- Madde/liste bağımlılığı yok. Akıcı prose. Gerekirse 1-2 kısa liste \
kabul edilebilir ama ana gövde paragraflar olsun.
- Kısa ve orta uzunlukta paragraflar (3-6 cümle).
- Giriş: araştırma sorusu veya gözlemle aç. \
"İstanbul'dan Rio'ya uçuşu araştıran bir Türk yolcu neyle karşılaşır?"
- Gelişme: destinasyonun araştırma bulguları (semtler, ulaşım, \
yemek kültürü, dikkat edilecekler).
- Sonuç: Türk yolcuya pratik özet (vize, uçuş süresi bağlamı, \
ne tür yolcu için uygun).

TÜRK YOLCU PERSPEKTİFİ — SOMUTLAŞTIR
Türk yolcuları diğer platformlardan ayıracak olan perspektifimiz. \
Yüzeysel "vize kolay" gibi cümlelerle geçme, somutlaştır:

- Vize durumu: "Türk vatandaşları için vize gerekliliği [VAR/YOK/\
E-VİZE] olarak biliniyor — güncel durum için kontrol önerilir." \
Emin değilsen "güncel vize gerekliliklerinin kontrolü önerilir" \
diyerek geç.
- Uçuş perspektifi: İstanbul'dan direkt mi uçuluyor genellikle, \
yoksa aktarmalı mı — GENEL olarak belirt. "THY direkt uçuş yapıyor" \
DEME (spesifik bilgi, değişebilir). "Direkt uçuş seçeneği genellikle \
mevcut" de.
- Kültürel köprü: Türk kültürüyle paralellik varsa (ortak yemek \
gelenekleri, Osmanlı tarihi bağları, müslüman nüfus, Türk topluluğu) \
somut ve doğrulanabilir bir şey yaz. Zorlama uydurma bağlantı \
kurma.
- İklim karşılaştırması: Eğer uyuyorsa "İstanbul yazından daha \
kuru/nemli/sıcak" gibi GENEL karşılaştırma ekleyebilirsin.

Bu perspektif tanıtım'da 1-2 cümle, ipuclari bölümünde detaylı \
olmalı — sadece tek cümle geçiştirme yasak.

KURAL İHLALİ DURUMU
Spesifik bir fiyat, saat veya kişisel anekdot yazma isteği hissedersen \
DURUR ve onu genel/araştırmacı bir ifadeye çevirirsin. \
Örnek: "25 real" → "ortalama bir sokak lezzeti bedeli"
Örnek: "Sabah 8'de gidin" → "sabah erken saatlerde ziyaret \
daha sakin geçer"
Örnek: "40 günlük gezimde" → "ekibimizin incelediği kaynaklarda"

JSON FORMATI
Çıktıyı mutlaka geçerli JSON olarak döndür. Mevcut JSON şemasını \
koru (sehir, ulke, tanitim, gezilecek_yerler, yemekler, ipuclari, \
gizli_nokta, uyari, en_iyi_zaman, butce, meta_description) — \
sadece içerik tonu değişiyor."""

USER_PROMPT_TEMPLATE = """{sehir_adi} şehri için "Dedektif Gezgin Araştırdı" tonunda kapsamlı \
bir seyahat rehberi hazırla.

Rehber minimum 800 kelime olsun. Türk yolcular için hazırlıyoruz — \
araştırmacı üçüncü şahıs bakış açısıyla, doğrulanabilir ve \
genel bilgiler temelinde.

JSON formatında döndür:
{{
  "sehir": "{sehir_adi}",
  "ulke": "...",
  "tanitim": "... (3 paragraf, araştırma sorusu veya gözlemle açılsın)",
  "gezilecek_yerler": [
    {{"isim": "...", "aciklama": "... (araştırmacı ton, genel bilgi)", "ipucu": "... (pratik, doğrulanabilir)"}},
    ... (5 yer)
  ],
  "yemekler": [
    {{"isim": "...", "aciklama": "... (genel bilgi, fiyat yerine bütçe seviyesi)"}},
    ... (5 yemek)
  ],
  "ipuclari": {{
    "ulasim": "... (genel, doğrulanabilir)",
    "para": "... (genel kur bilgisi, kart/nakit durumu)",
    "dil": "... (Türk yolcular için)",
    "guvenlik": "... (gerçekçi, abartısız)"
  }},
  "gizli_nokta": "... (az bilinen ama doğrulanabilir bir bilgi)",
  "uyari": "... (dikkat edilmesi gereken bir konu)",
  "en_iyi_zaman": "...",
  "butce": {{"ekonomik": "... genel seviye", "orta": "... genel seviye", "luks": "... genel seviye"}},
  "meta_description": "... (max 160 karakter, SEO uyumlu)"
}}

Sistem mesajındaki tüm kurallara uy — özellikle uydurma fiyat/saat/anekdot yasağına."""


def rehber_uret(iata, sehir_adi):
    """Tek şehir için Claude ile rehber üret."""
    user_prompt = USER_PROMPT_TEMPLATE.format(sehir_adi=sehir_adi)

    sonuc = claude_sor(
        user_prompt,
        json_mod=True,
        max_tokens=6000,
        system=SYSTEM_PROMPT,
        temperature=0.7,
    )
    if not sonuc or not isinstance(sonuc, dict) or 'sehir' not in sonuc:
        log.warning("Rehber üretilemedi: %s (%s)", sehir_adi, iata)
        return None

    sonuc['iata'] = iata
    sonuc['olusturulma'] = datetime.now().isoformat()
    sonuc['yazar'] = 'Dedektif Gezgin Ekibi'
    sonuc['son_guncelleme'] = datetime.now().strftime('%d %B %Y').replace(
        'January','Ocak').replace('February','Şubat').replace('March','Mart').replace(
        'April','Nisan').replace('May','Mayıs').replace('June','Haziran').replace(
        'July','Temmuz').replace('August','Ağustos').replace('September','Eylül').replace(
        'October','Ekim').replace('November','Kasım').replace('December','Aralık')
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

    # Yurtiçi rehberler üretilmez — Dedektif Gezgin yurtdışı fırsatlarına odaklanır
    kuyruk = [(iata, sehir) for iata, sehir in kuyruk if iata not in TURKIYE_IATA]

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
