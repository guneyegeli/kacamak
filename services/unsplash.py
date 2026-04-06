import requests
import os
from functools import lru_cache
from dotenv import load_dotenv

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
    "HND": "Tokyo", "ICN": "Seoul", "SIN": "Singapore",
}


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
    "ESB": "Anitkabir Ankara",
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
}


def sehir_adi(destinasyon: str) -> str:
    return SEHIR_ISIMLERI.get(destinasyon, destinasyon)


@lru_cache(maxsize=200)
def foto_getir(destinasyon: str, adet: int = 3) -> list:
    if not ACCESS_KEY:
        return []

    query = IATA_ARAMA_TERIMLERI.get(destinasyon)
    if not query:
        sehir = SEHIR_ISIMLERI.get(destinasyon, destinasyon)
        query = f"{sehir} landmark"

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
        print(f"[Unsplash] Hata: {e}")
        return []


@lru_cache(maxsize=100)
def galeri_getir(destinasyon: str, adet: int = 6) -> list:
    return foto_getir(destinasyon, adet)
