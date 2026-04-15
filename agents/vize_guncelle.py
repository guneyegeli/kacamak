#!/usr/bin/env python3
"""
Türk vatandaşları için vize durumlarını MFA sitesinden çeker,
IATA kodlarıyla eşleştirip frontend JSON dosyasına yazar.
"""

import json
import os
import re
import sys
from datetime import date
from urllib.request import urlopen, Request
from html.parser import HTMLParser

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPPING_PATH = os.path.join(BASE_DIR, 'data', 'ulke_iata_mapping.json')
OUTPUT_PATH = os.path.join(BASE_DIR, 'frontend', 'src', 'utils', 'vizesiz_otomatik.json')
MFA_URL = 'https://www.mfa.gov.tr/turk-vatandaslarinin-tabi-oldugu-vize-uygulamalari.tr.mfa'


class MFATableParser(HTMLParser):
    """MFA sayfasındaki tablodan ülke-vize bilgilerini çıkarır."""

    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.current_row = []
        self.current_cell = ''
        self.rows = []
        self.table_count = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.table_count += 1
            self.in_table = True
        elif self.in_table and tag == 'tr':
            self.in_row = True
            self.current_row = []
        elif self.in_row and tag in ('td', 'th'):
            self.in_cell = True
            self.current_cell = ''

    def handle_endtag(self, tag):
        if tag == 'table' and self.in_table:
            self.in_table = False
        elif tag == 'tr' and self.in_row:
            self.in_row = False
            if self.current_row:
                self.rows.append(self.current_row)
        elif tag in ('td', 'th') and self.in_cell:
            self.in_cell = False
            self.current_row.append(self.current_cell.strip())

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell += data


def fetch_page(url):
    """Sayfayı indir."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9',
    }
    req = Request(url, headers=headers)
    with urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8', errors='replace')


def normalize(text):
    """Türkçe karakterleri normalize et, küçük harfe çevir."""
    text = text.lower().strip()
    # Fazla boşlukları temizle
    text = re.sub(r'\s+', ' ', text)
    return text


def kategorize(vize_metni):
    """Vize metnine göre kategori belirle.

    MFA formatında genellikle birden fazla pasaport tipi için ayrı bilgi var.
    Biz "Umuma mahsus pasaport" (normal vatandaş) satırına bakarız.
    """
    metin = normalize(vize_metni)

    tam_metin = metin  # Tüm vize bilgisi

    # Umuma mahsus pasaport bölümünü ayıkla
    umuma_match = re.search(
        r'umuma\s+mahsus[^.]*?(?:vizeden\s+muaf|vizeye\s+tabi)[^.]*\.?',
        metin
    )
    umuma_metin = umuma_match.group(0) if umuma_match else metin

    # 1. Vizesiz kontrol (umuma mahsus pasaport satırına bak)
    vizesiz_ifadeler = [
        'vizeden muaf', 'vize muaf', 'vizesiz', 'vize uygulanma',
        'vize yok', 'muaftır', 'muafiyet',
    ]
    vizeli_ifadeler = [
        'vizeye tabi', 'vize gerekli', 'vize uygulan',
        'vize zorunlu',
    ]

    is_vizesiz = any(ifade in umuma_metin for ifade in vizesiz_ifadeler)
    is_vizeli = any(ifade in umuma_metin for ifade in vizeli_ifadeler)

    if is_vizesiz and not is_vizeli:
        return 'vizesiz'

    # 2. E-vize kontrol (tam metne bak — e-vize bilgisi ayrı cümlede olabilir)
    evize_ifadeler = ['e-vize', 'elektronik vize', 'e vize', 'evize']
    if any(ifade in tam_metin for ifade in evize_ifadeler):
        return 'evize'

    # 3. Kapıda vize kontrol (tam metne bak)
    kapida_ifadeler = ['sınır kapı', 'kapıda vize', 'kapida vize',
                       'havalimanında vize', 'ülkeye girişte',
                       'sınır kapılarından', 'sınır kapılarında']
    if any(ifade in tam_metin for ifade in kapida_ifadeler):
        return 'kapida'

    return 'vizeli'


def parse_mfa_data(html):
    """MFA sayfasından ülke-vize verilerini parse et.

    Sayfa formatı: <b><span ...>ÜlkeAdı:</span></b> vize bilgisi<br />
    """
    # HTML tag'lerini temizleyen yardımcı
    def strip_tags(text):
        return re.sub(r'<[^>]+>', '', text)

    ulke_vize = {}

    # İki olası pattern: </span></b> veya </b></span>
    pattern1 = r'<b>\s*<span[^>]*>([^<]+)</span>\s*</b>(.*?)(?=<b>\s*<span|$)'
    pattern2 = r'<b>\s*<span[^>]*>([^<]+)</b>\s*</span>(.*?)(?=<b>\s*<span|$)'
    matches1 = re.findall(pattern1, html, re.DOTALL | re.IGNORECASE)
    matches2 = re.findall(pattern2, html, re.DOTALL | re.IGNORECASE)
    matches = matches1 + matches2

    for ulke_raw, bilgi_raw in matches:
        ulke_adi = strip_tags(ulke_raw).strip().rstrip(':').strip()
        vize_bilgi = strip_tags(bilgi_raw).strip()

        if not ulke_adi or len(ulke_adi) < 2 or len(ulke_adi) > 80:
            continue
        # Sayısal veya genel başlık satırlarını atla
        if re.match(r'^\d+$', ulke_adi):
            continue

        # İlk eşleşmeyi tut, duplicate'leri atla
        if ulke_adi and vize_bilgi and ulke_adi not in ulke_vize:
            ulke_vize[ulke_adi] = vize_bilgi

    return ulke_vize


def match_with_mapping(ulke_vize, mapping):
    """Ülke adlarını IATA kodlarıyla eşleştir."""
    sonuc = {'vizesiz': [], 'evize': [], 'kapida': []}

    # Mapping'deki her ülke için MFA verisinde ara
    for mapping_ulke, iata_kodlari in mapping.items():
        mapping_norm = normalize(mapping_ulke)

        en_iyi_eslesme = None
        en_iyi_skor = 0
        for mfa_ulke, vize_bilgi in ulke_vize.items():
            mfa_norm = normalize(mfa_ulke)

            skor = 0
            if mapping_norm == mfa_norm:
                skor = 100  # Tam eşleşme
            elif mapping_norm == mfa_norm.split('(')[0].strip():
                skor = 90  # Parantez öncesi eşleşme
            elif mfa_norm == mapping_norm.split('(')[0].strip():
                skor = 90
            elif mapping_norm in mfa_norm and len(mapping_norm) > len(mfa_norm) * 0.6:
                skor = 70  # Alt string ama yeterince uzun
            elif mfa_norm in mapping_norm and len(mfa_norm) > len(mapping_norm) * 0.6:
                skor = 70

            if skor > en_iyi_skor:
                en_iyi_skor = skor
                en_iyi_eslesme = vize_bilgi

        if en_iyi_eslesme:
            kategori = kategorize(en_iyi_eslesme)
            if kategori in sonuc:
                sonuc[kategori].extend(iata_kodlari)

    return sonuc


def fallback_data():
    """MFA çekilemezse mevcut statik listeyi kullan."""
    return {
        'vizesiz': [
            'BEG', 'SKP', 'TIA', 'SJJ', 'BNX', 'TGD', 'TIV', 'PRN',
            'MSQ', 'KIV', 'IEV', 'KBP',
            'TBS', 'BUS', 'GYD', 'BAK', 'GNJ',
            'TAS', 'SKD', 'FEG', 'OSS', 'FRU', 'NQZ', 'ALA', 'CIT',
            'CMN', 'RAK', 'AGA', 'TUN', 'NBE', 'CPT', 'JNB', 'MRU', 'SEZ',
            'AMM', 'AQJ', 'DAM',
            'HND', 'NRT', 'KIX', 'NGO', 'CTS',
            'ICN', 'GMP', 'PUS', 'HKG',
            'KUL', 'LGK', 'JHB', 'SIN',
            'BKK', 'HKT', 'CNX', 'MNL', 'CEB', 'DPS', 'CGK', 'BWN',
            'EZE', 'BUE', 'GRU', 'GIG', 'BOG', 'LIM', 'SCL',
            'MVD', 'ASU', 'GYE', 'UIO',
            'ECN', 'LCA', 'PFO',
        ],
        'evize': [
            'MOW', 'SVO', 'VKO', 'DME', 'LED', 'AER', 'KRR',
            'RMO', 'ROV', 'VOZ', 'KZN', 'SVX', 'MRV', 'MCX',
            'GRV', 'OGZ', 'CEK', 'UFA', 'PEE', 'GOJ', 'OMS',
            'KJA', 'TJM', 'KGD', 'RTW', 'OVB', 'KUF',
            'DXB', 'AUH', 'SHJ', 'DOH',
            'RUH', 'JED', 'MED', 'CMB',
        ],
        'kapida': [
            'CAI', 'SSH', 'HRG',
        ],
    }


def main():
    # Mapping dosyasını oku
    with open(MAPPING_PATH, 'r', encoding='utf-8') as f:
        mapping = json.load(f)

    # MFA sayfasını çek ve parse et
    sonuc = None
    try:
        print('MFA sayfası indiriliyor...')
        html = fetch_page(MFA_URL)
        print(f'Sayfa indirildi ({len(html)} karakter)')

        ulke_vize = parse_mfa_data(html)
        print(f'{len(ulke_vize)} ülke verisi parse edildi')

        if ulke_vize:
            sonuc = match_with_mapping(ulke_vize, mapping)
    except Exception as e:
        print(f'MFA sayfası çekilemedi: {e}')

    # MFA'dan yeterli veri gelmezse fallback kullan
    if not sonuc or (not sonuc['vizesiz'] and not sonuc['evize']):
        print('MFA verileri yetersiz, fallback liste kullanılıyor...')
        sonuc = fallback_data()

    # Tekrar eden kodları temizle, sırala
    for key in sonuc:
        sonuc[key] = sorted(set(sonuc[key]))

    # JSON çıktısı
    output = {
        'guncelleme_tarihi': date.today().isoformat(),
        'vizesiz': sonuc['vizesiz'],
        'evize': sonuc['evize'],
        'kapida': sonuc['kapida'],
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # Özet
    print(f'\nSonuç: {OUTPUT_PATH}')
    print(f'Vizesiz: {len(output["vizesiz"])} IATA kodu')
    print(f'E-vize: {len(output["evize"])} IATA kodu')
    print(f'Kapıda: {len(output["kapida"])} IATA kodu')
    print(f'Güncelleme: {output["guncelleme_tarihi"]}')


if __name__ == '__main__':
    main()
