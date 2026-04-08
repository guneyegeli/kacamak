import requests
import os
import logging
from functools import lru_cache
from dotenv import load_dotenv

log = logging.getLogger("unsplash")

load_dotenv()

ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
BASE = "https://api.unsplash.com"

SEHIR_ISIMLERI = {
    "IST": "Istanbul", "SAW": "Istanbul", "ADB": "Izmir",
    "AYT": "Antalya", "ESB": "Ankara", "ADA": "Adana",
    "LHR": "London", "CDG": "Paris", "FCO": "Rome",
    "BCN": "Barcelona", "AMS": "Amsterdam", "BER": "Berlin",
    "ATH": "Athens", "VIE": "Vienna", "PRG": "Prague",
    "BUD": "Budapest", "WAW": "Warsaw", "LIS": "Lisbon",
    "DUB": "Dublin", "CPH": "Copenhagen", "OSL": "Oslo",
    "ARN": "Stockholm", "HEL": "Helsinki", "ZRH": "Zurich",
    "BRU": "Brussels", "MXP": "Milan", "MAD": "Madrid",
    "MUC": "Munich", "TBS": "Tbilisi", "GYD": "Baku",
    "DXB": "Dubai", "DOH": "Doha", "CAI": "Cairo",
    "CMN": "Casablanca", "TUN": "Tunis", "SSH": "Sharm el Sheikh",
    "JFK": "New York", "LAX": "Los Angeles", "BKK": "Bangkok",
    "HND": "Tokyo", "NRT": "Tokyo", "ICN": "Seoul", "SIN": "Singapore",
    # Türkiye ek
    "TZX": "Trabzon", "GZT": "Gaziantep", "BJV": "Bodrum",
    "DIY": "Diyarbakir", "VAN": "Van", "ERZ": "Erzurum", "SZF": "Samsun",
    "YEI": "Bursa", "RZV": "Rize", "VAS": "Sivas", "MSR": "Mus",
    # Almanya
    "FRA": "Frankfurt", "DTM": "Dortmund", "DUS": "Dusseldorf",
    "HAM": "Hamburg", "STR": "Stuttgart", "CGN": "Cologne",
    "NUE": "Nuremberg", "HAJ": "Hannover", "BRE": "Bremen", "LEJ": "Leipzig",
    "TXL": "Berlin",
    # Fransa / İngiltere / İtalya ek
    "ORY": "Paris", "LGW": "London", "STN": "London", "LTN": "London",
    "CIA": "Rome", "BGY": "Milan",
    # İspanya ek
    "TCI": "Tenerife",
    # Rusya ek
    "SVO": "Moscow", "VKO": "Moscow", "DME": "Moscow",
    "ROV": "Rostov", "VOZ": "Voronezh",
    # Kafkasya / Orta Doğu
    "EVN": "Yerevan", "RUH": "Riyadh", "MCT": "Muscat",
    "BAH": "Bahrain", "KWI": "Kuwait", "AMM": "Amman",
    # Kıbrıs
    "ECN": "Nicosia", "LCA": "Larnaca", "PFO": "Paphos",
    # Afrika ek
    "RAK": "Marrakech",
    # Balkanlar
    "OTP": "Bucharest", "SOF": "Sofia", "BEG": "Belgrade",
    "SKP": "Skopje", "TIA": "Tirana", "ZAG": "Zagreb", "SJJ": "Sarajevo",
    # Uzak Doğu
    "KUL": "Kuala Lumpur", "MLE": "Maldives", "HRG": "Hurghada",
    "HKT": "Phuket", "MNL": "Manila", "DPS": "Bali",
    "PEK": "Beijing", "PVG": "Shanghai", "HKG": "Hong Kong",
    "DEL": "Delhi", "BOM": "Mumbai", "CMB": "Colombo",
    # Amerika
    "MIA": "Miami", "SFO": "San Francisco", "ORD": "Chicago", "ATL": "Atlanta",
    "YYZ": "Toronto", "MEX": "Mexico City", "CUN": "Cancun",
    "GRU": "Sao Paulo", "GIG": "Rio de Janeiro", "EZE": "Buenos Aires",
    # Okyanusya
    "SYD": "Sydney", "MEL": "Melbourne", "AKL": "Auckland",
    # Şehir kodları (havalimanı değil)
    "PAR": "Paris", "ROM": "Rome", "LON": "London", "TYO": "Tokyo",
    "MOW": "Moscow", "LED": "Saint Petersburg",
    # Rusya / Orta Asya ek
    "AER": "Sochi", "KRR": "Krasnodar", "RMO": "Rostov on Don",
    "SVX": "Yekaterinburg", "MRV": "Mineralnye Vody", "IKT": "Irkutsk",
    "TAS": "Tashkent", "BSZ": "Bishkek", "CIT": "Shymkent", "FEG": "Fergana",
    # Kafkasya / Orta Doğu ek
    "BAK": "Baku", "GNJ": "Ganja", "SHJ": "Sharjah", "TIV": "Tivat",
    # Avrupa ek
    "BTS": "Bratislava", "BUH": "Bucharest", "PRN": "Pristina",
    "NAP": "Naples", "MRS": "Marseille", "RTM": "Rotterdam",
    "POZ": "Poznan", "ABZ": "Aberdeen", "CJU": "Jeju Island",
    "COV": "Konya", "IZM": "Izmir", "ANK": "Ankara", "GZP": "Trabzon",
    # Türkiye ek
    "ASR": "Kayseri", "KYA": "Konya", "DLM": "Dalaman", "NAV": "Cappadocia",
    "DNZ": "Denizli Pamukkale", "EDO": "Balikesir", "EZS": "Elazig",
    "GNY": "Sanliurfa", "HTY": "Hatay Antakya", "IGD": "Igdir",
    "ISE": "Isparta", "KSY": "Kars", "MLX": "Malatya", "MQM": "Mardin",
    "NOP": "Sinop", "ONQ": "Zonguldak", "CKZ": "Canakkale",
}


# Hero fotoğraf arama terimleri — sadece spesifik landmark isimleri
IATA_ARAMA_TERIMLERI = {
    "IST": "Hagia Sophia Istanbul",
    "SAW": "Hagia Sophia Istanbul",
    "BCN": "Sagrada Familia Barcelona",
    "FCO": "Colosseum Rome",
    "CDG": "Eiffel Tower Paris",
    "LHR": "Tower Bridge London",
    "AMS": "Amsterdam canals",
    "PRG": "Charles Bridge Prague",
    "ATH": "Parthenon Athens",
    "BUD": "Budapest Parliament Danube",
    "VIE": "Schönbrunn Palace Vienna",
    "LIS": "Lisbon tram Alfama",
    "DXB": "Burj Khalifa Dubai",
    "TBS": "Tbilisi Old Town",
    "BER": "Brandenburg Gate Berlin",
    "MAD": "Plaza Mayor Madrid",
    "MXP": "Milan Cathedral Duomo",
    "AYT": "Antalya old town Kaleici",
    "ADB": "Izmir clock tower Konak",
    "ESB": "Anitkabir mausoleum",
    "ANK": "Anitkabir mausoleum",
    "DLM": "Oludeniz beach Fethiye",
    "NAV": "Cappadocia balloon",
    "BJV": "Bodrum castle harbor",
    "BKK": "Grand Palace Bangkok",
    "HND": "Tokyo Tower Shibuya",
    "ICN": "Gyeongbokgung Palace Seoul",
    "SIN": "Marina Bay Sands Singapore",
    "JFK": "Statue of Liberty New York",
    "LAX": "Hollywood sign Los Angeles",
    "CAI": "Pyramids of Giza Cairo",
    "DOH": "Doha skyline corniche",
    "WAW": "Warsaw Old Town Market Square",
    "DUB": "Dublin Temple Bar",
    "CPH": "Nyhavn Copenhagen",
    "OSL": "Oslo Opera House",
    "ARN": "Stockholm Gamla Stan",
    "HEL": "Helsinki Cathedral Senate Square",
    "ZRH": "Zurich lake old town",
    "BRU": "Grand Place Brussels",
    "MUC": "Marienplatz Munich",
    "GYD": "Baku Flame Towers",
    "CMN": "Hassan II Mosque Casablanca",
    "TUN": "Tunis Medina",
    "SSH": "Sharm el Sheikh Red Sea coral",
    "AER": "Sochi beach Black Sea",
    # Yeni Türkiye havalimanları
    "RZV": "Rize Turkey nature tea plantation",
    "VAS": "Sivas Divrigi Great Mosque",
    "MSR": "Mus Turkey landscape",
    "YEI": "Bursa Green Mosque Ottoman",
    # Yeni çıkış havalimanları
    "TZX": "Trabzon Sumela Monastery",
    "GZT": "Gaziantep Zeugma mosaic",
    "DIY": "Diyarbakir city walls",
    "VAN": "Van cat Van lake",
    "ERZ": "Erzurum Palandoken",
    "SZF": "Samsun Bandirma ship museum",
    # Balkanlar
    "OTP": "Palace of Parliament Bucharest",
    "SOF": "Alexander Nevsky Cathedral Sofia",
    "BEG": "Belgrade Fortress Kalemegdan",
    "SKP": "Skopje Stone Bridge",
    "TIA": "Skanderbeg Square Tirana",
    "ZAG": "Zagreb Cathedral Ban Jelacic",
    "SJJ": "Sarajevo Latin Bridge Bascarsija",
    # Uzak
    "NRT": "Tokyo Tower Shibuya",
    "KUL": "Petronas Towers Kuala Lumpur",
    "MLE": "Maldives overwater bungalow",
    "HRG": "Hurghada Red Sea coral reef",
}

# Sabit fotoğraflar — API'ye bağımlı olmadan her zaman doğru sonuç
_ANITKABIR = {
    "url_kucuk": "https://images.unsplash.com/photo-1728157213837-9a69929258bf?w=400&q=80",
    "url_orta": "https://images.unsplash.com/photo-1728157213837-9a69929258bf?w=1080&q=80",
    "url_buyuk": "https://images.unsplash.com/photo-1728157213837-9a69929258bf?w=1920&q=80",
    "fotograf": "Cengiz Özarpat",
    "link": "https://unsplash.com/photos/8rhOrDVsNKM",
}
SABIT_FOTOLAR = {
    "ANK": [_ANITKABIR],
    "ESB": [_ANITKABIR],
}


def _sehir_adi_coz(destinasyon: str) -> str | None:
    """IATA kodundan İngilizce şehir adı çözer. Birden fazla kaynağa bakar."""
    if destinasyon in SEHIR_ISIMLERI:
        return SEHIR_ISIMLERI[destinasyon]
    # Fallback: koordinat.py'deki isim alanı
    try:
        from services.koordinat import SEHIR_KOORDINATLARI
        k = SEHIR_KOORDINATLARI.get(destinasyon)
        if k and k.get("isim"):
            return k["isim"]
    except ImportError:
        pass
    return None


def sehir_adi(destinasyon: str) -> str:
    return _sehir_adi_coz(destinasyon) or destinasyon


def _unsplash_ara(query: str, adet: int) -> list:
    """Tek bir Unsplash araması yapar."""
    try:
        r = requests.get(f"{BASE}/search/photos", params={
            "query": query,
            "per_page": adet,
            "orientation": "landscape",
            "content_filter": "high",
        }, headers={
            "Authorization": f"Client-ID {ACCESS_KEY}"
        }, timeout=5)
        if not r.ok:
            return []
        data = r.json().get("results", [])
        return [
            {
                "url_kucuk": p["urls"]["small"],
                "url_orta": p["urls"]["regular"],
                "url_buyuk": p["urls"]["full"],
                "fotograf": p["user"]["name"],
                "link": p["links"]["html"],
            }
            for p in data
        ]
    except Exception as e:
        log.warning("Arama hatası: %s", e)
        return []


@lru_cache(maxsize=200)
def foto_getir(destinasyon: str, adet: int = 3) -> list:
    # Sabit fotoğraf varsa öncelikle onu döndür
    if destinasyon in SABIT_FOTOLAR:
        return SABIT_FOTOLAR[destinasyon]

    if not ACCESS_KEY:
        return []

    # 1. Özel arama terimi varsa onu kullan
    ozel = IATA_ARAMA_TERIMLERI.get(destinasyon)
    if ozel:
        sonuc = _unsplash_ara(ozel, adet)
        if sonuc:
            return sonuc

    # Şehir adını çöz
    sehir = _sehir_adi_coz(destinasyon)
    if not sehir:
        return []

    # 2. Şehir + landmark
    sonuc = _unsplash_ara(f"{sehir} landmark", adet)
    if sonuc:
        return sonuc

    # 3. Sadece şehir adı
    sonuc = _unsplash_ara(sehir, adet)
    if sonuc:
        return sonuc

    # 4. Genel fallback: "travel scenic"
    return _unsplash_ara("travel landscape scenic", adet)


# Galeri için destinasyona özel çoklu arama terimleri — spesifik landmark isimleri
_ANKARA_GALERI = [
    "Anitkabir mausoleum",
    "Ankara castle",
    "Kocatepe Camii mosque",
    "Atakule tower Ankara",
]
_KAPADOKYA_GALERI = [
    "Cappadocia balloon",
    "Goreme fairy chimneys",
    "Cappadocia underground city",
    "Uchisar castle Cappadocia",
]
_DALAMAN_GALERI = [
    "Oludeniz beach Fethiye",
    "Dalyan Iztuzu beach",
    "Saklikent gorge Fethiye",
    "Kayakoy ghost village",
]
GALERI_TERIMLERI = {
    "ANK": _ANKARA_GALERI,
    "ESB": _ANKARA_GALERI,
    "NAV": _KAPADOKYA_GALERI,
    "DLM": _DALAMAN_GALERI,
}


@lru_cache(maxsize=100)
def galeri_getir(destinasyon: str, adet: int = 6) -> list:
    ozel_terimler = GALERI_TERIMLERI.get(destinasyon)
    if ozel_terimler and ACCESS_KEY:
        sonuclar = []
        for terim in ozel_terimler:
            if len(sonuclar) >= adet:
                break
            try:
                r = requests.get(f"{BASE}/search/photos", params={
                    "query": terim,
                    "per_page": 1,
                    "orientation": "landscape",
                    "content_filter": "high",
                }, headers={
                    "Authorization": f"Client-ID {ACCESS_KEY}"
                }, timeout=5)
                if r.ok:
                    data = r.json().get("results", [])
                    for p in data[:1]:
                        sonuclar.append({
                            "url_kucuk": p["urls"]["small"],
                            "url_orta": p["urls"]["regular"],
                            "url_buyuk": p["urls"]["full"],
                            "fotograf": p["user"]["name"],
                            "link": p["links"]["html"],
                        })
            except Exception:
                continue
        return sonuclar
    return foto_getir(destinasyon, adet)
