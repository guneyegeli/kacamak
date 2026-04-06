import requests
import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

GYG_PARTNER_ID = os.getenv("GETYOURGUIDE_PARTNER_ID")
GYG_API_KEY = os.getenv("GETYOURGUIDE_API_KEY")
BASE = "https://api.getyourguide.com/1"

SEHIR_ISIMLERI = {
    "LHR": "London", "CDG": "Paris", "FCO": "Rome",
    "BCN": "Barcelona", "AMS": "Amsterdam", "BER": "Berlin",
    "ATH": "Athens", "VIE": "Vienna", "PRG": "Prague",
    "BUD": "Budapest", "LIS": "Lisbon", "MAD": "Madrid",
    "MXP": "Milan", "MUC": "Munich", "DUB": "Dublin",
    "CPH": "Copenhagen", "IST": "Istanbul", "SAW": "Istanbul",
    "ADB": "Izmir", "AYT": "Antalya", "DXB": "Dubai",
    "BKK": "Bangkok", "HND": "Tokyo", "TBS": "Tbilisi",
}

# GetYourGuide API mevcut degilse, populer aktiviteleri statik olarak sun
POPULER_AKTIVITELER = {
    "Paris": [
        {"baslik": "Eyfel Kulesi Oncelikli Giris", "aciklama": "Kuyruk beklemeden Eyfel Kulesi'ne cikis", "fiyat_eur": 35, "sure": "2 saat", "puan": 4.7, "emoji": "🗼"},
        {"baslik": "Louvre Muzesi Rehberli Tur", "aciklama": "Mona Lisa ve diger basyapitlar", "fiyat_eur": 55, "sure": "3 saat", "puan": 4.8, "emoji": "🎨"},
        {"baslik": "Seine Nehri Tekne Turu", "aciklama": "Paris'i sudan kesfet", "fiyat_eur": 15, "sure": "1 saat", "puan": 4.5, "emoji": "🚢"},
    ],
    "Rome": [
        {"baslik": "Kolezyum & Forum Oncelikli Giris", "aciklama": "Antik Roma'nin kalbine yolculuk", "fiyat_eur": 45, "sure": "3 saat", "puan": 4.8, "emoji": "🏛️"},
        {"baslik": "Vatikan Muzeleri & Sistine Sapeli", "aciklama": "Michelangelo'nun basyapiti", "fiyat_eur": 60, "sure": "3 saat", "puan": 4.7, "emoji": "⛪"},
        {"baslik": "Roma Yemek Turu - Trastevere", "aciklama": "Otantik Italyan lezzetleri", "fiyat_eur": 75, "sure": "3.5 saat", "puan": 4.9, "emoji": "🍝"},
    ],
    "Barcelona": [
        {"baslik": "Sagrada Familia Oncelikli Giris", "aciklama": "Gaudi'nin efsanevi eseri", "fiyat_eur": 40, "sure": "1.5 saat", "puan": 4.8, "emoji": "⛪"},
        {"baslik": "Park Guell Rehberli Tur", "aciklama": "Gaudi'nin renkli dunyasi", "fiyat_eur": 25, "sure": "1.5 saat", "puan": 4.6, "emoji": "🦎"},
        {"baslik": "Tapas & Sarap Turu - Gothic Quarter", "aciklama": "5 durakhk gastronomi turu", "fiyat_eur": 65, "sure": "3 saat", "puan": 4.7, "emoji": "🍷"},
    ],
    "Amsterdam": [
        {"baslik": "Kanal Turu", "aciklama": "Amsterdam'i kanallardan kesfet", "fiyat_eur": 16, "sure": "1 saat", "puan": 4.5, "emoji": "🚤"},
        {"baslik": "Anne Frank Evi Rehberli Tur", "aciklama": "Tarihi mekan ve hikayesi", "fiyat_eur": 40, "sure": "2 saat", "puan": 4.8, "emoji": "📖"},
        {"baslik": "Bisikletle Sehir Turu", "aciklama": "Hollanda tarzinda kesfet", "fiyat_eur": 30, "sure": "2.5 saat", "puan": 4.6, "emoji": "🚲"},
    ],
    "London": [
        {"baslik": "Tower of London & Tac Mucevherleri", "aciklama": "1000 yillik kale", "fiyat_eur": 35, "sure": "2.5 saat", "puan": 4.7, "emoji": "👑"},
        {"baslik": "Harry Potter Warner Bros Studio", "aciklama": "Buyulu dunyaya yolculuk", "fiyat_eur": 95, "sure": "4 saat", "puan": 4.9, "emoji": "🧙"},
        {"baslik": "Thames Nehri Aksam Yemegi Turu", "aciklama": "Isikli Londra manzarasi", "fiyat_eur": 80, "sure": "2.5 saat", "puan": 4.6, "emoji": "🌉"},
    ],
    "Prague": [
        {"baslik": "Prag Kalesi Rehberli Tur", "aciklama": "Dunyanin en buyuk kalesi", "fiyat_eur": 30, "sure": "2.5 saat", "puan": 4.7, "emoji": "🏰"},
        {"baslik": "Cek Birasi Tadim Turu", "aciklama": "3 bira fabrikasi ziyareti", "fiyat_eur": 45, "sure": "3 saat", "puan": 4.8, "emoji": "🍺"},
        {"baslik": "Vltava Nehri Gece Turu", "aciklama": "Isikli Prag kopru manzarasi", "fiyat_eur": 20, "sure": "1 saat", "puan": 4.5, "emoji": "🌃"},
    ],
    "Athens": [
        {"baslik": "Akropolis & Parthenon Rehberli Tur", "aciklama": "Antik Yunan medeniyeti", "fiyat_eur": 40, "sure": "2 saat", "puan": 4.8, "emoji": "🏛️"},
        {"baslik": "Atina Yemek Turu", "aciklama": "Yunan mutfagi tadim", "fiyat_eur": 60, "sure": "3.5 saat", "puan": 4.7, "emoji": "🥙"},
        {"baslik": "Santorini Gunubirlik Tur", "aciklama": "Ucakla git-gel", "fiyat_eur": 280, "sure": "14 saat", "puan": 4.6, "emoji": "🏝️"},
    ],
    "Budapest": [
        {"baslik": "Tuna Nehri Aksam Turu", "aciklama": "Isikli Parlamento manzarasi", "fiyat_eur": 25, "sure": "1 saat", "puan": 4.7, "emoji": "🌉"},
        {"baslik": "Szechenyi Termal Hamam", "aciklama": "Avrupa'nin en buyuk hamami", "fiyat_eur": 30, "sure": "3 saat", "puan": 4.6, "emoji": "♨️"},
        {"baslik": "Budapes Yemek & Sarap Turu", "aciklama": "Macar lezzetleri", "fiyat_eur": 55, "sure": "3 saat", "puan": 4.8, "emoji": "🍖"},
    ],
    "Vienna": [
        {"baslik": "Schonbrunn Sarayi Turu", "aciklama": "Habsburglarin yazlik sarayi", "fiyat_eur": 40, "sure": "2 saat", "puan": 4.7, "emoji": "🏰"},
        {"baslik": "Viyana Klasik Konser Gecesi", "aciklama": "Mozart & Strauss", "fiyat_eur": 65, "sure": "2 saat", "puan": 4.9, "emoji": "🎻"},
        {"baslik": "Viyana Kahve & Pasta Turu", "aciklama": "Sachertorte ve otesi", "fiyat_eur": 45, "sure": "2.5 saat", "puan": 4.6, "emoji": "☕"},
    ],
    "Lisbon": [
        {"baslik": "Belem Kulesi & Jeronimos Manastiri", "aciklama": "Portekiz'in kesif cagi", "fiyat_eur": 30, "sure": "2.5 saat", "puan": 4.7, "emoji": "⛵"},
        {"baslik": "Sintra Gunubirlik Tur", "aciklama": "Peri masali saraylari", "fiyat_eur": 55, "sure": "8 saat", "puan": 4.8, "emoji": "🏰"},
        {"baslik": "Lizbon Tramvay & Fado Gecesi", "aciklama": "28 numarali tramvay + canli fado", "fiyat_eur": 45, "sure": "4 saat", "puan": 4.6, "emoji": "🎵"},
    ],
    "Dubai": [
        {"baslik": "Col Safarisi & BBQ Aksam Yemegi", "aciklama": "4x4 dune bashing + deve binisi", "fiyat_eur": 55, "sure": "6 saat", "puan": 4.7, "emoji": "🐪"},
        {"baslik": "Burj Khalifa Giris (At the Top)", "aciklama": "Dunyanin en yuksek binasi", "fiyat_eur": 40, "sure": "1.5 saat", "puan": 4.6, "emoji": "🏙️"},
        {"baslik": "Eski Dubai Yuruyus & Sokak Yemegi", "aciklama": "Gold Souk, Spice Souk, abra", "fiyat_eur": 35, "sure": "3 saat", "puan": 4.8, "emoji": "✨"},
    ],
}


def _gyg_affiliate_link(sehir: str) -> str:
    partner = GYG_PARTNER_ID or "kacamak"
    slug = sehir.lower().replace(" ", "-")
    return f"https://www.getyourguide.com/s/?q={slug}&partner_id={partner}&cmp=kacamak"


@lru_cache(maxsize=100)
def aktiviteler_getir(destinasyon: str) -> list:
    from services.unsplash import SEHIR_ISIMLERI
    sehir = SEHIR_ISIMLERI.get(destinasyon, destinasyon)

    # GetYourGuide API varsa onu kullan
    if GYG_API_KEY:
        try:
            r = requests.get(f"{BASE}/tours", params={
                "q": sehir,
                "currency": "eur",
                "limit": 5,
            }, headers={
                "X-Access-Token": GYG_API_KEY,
            }, timeout=5)
            if r.ok:
                data = r.json().get("data", {}).get("tours", [])
                return [
                    {
                        "baslik": t["title"],
                        "aciklama": t.get("abstract", ""),
                        "fiyat_eur": t.get("price", {}).get("values", {}).get("amount", 0),
                        "sure": t.get("duration_text", ""),
                        "puan": t.get("overall_rating", 0),
                        "emoji": "🎯",
                        "link": f"{t.get('url', '')}?partner_id={GYG_PARTNER_ID}",
                        "resim": t.get("pictures", [{}])[0].get("url", ""),
                    }
                    for t in data[:5]
                ]
        except Exception as e:
            print(f"[GetYourGuide] API hata: {e}")

    # Fallback: statik populer aktiviteler
    aktiviteler = POPULER_AKTIVITELER.get(sehir, [])
    base_link = _gyg_affiliate_link(sehir)
    return [
        {**a, "link": base_link, "resim": ""}
        for a in aktiviteler
    ]
