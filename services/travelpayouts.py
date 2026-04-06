import requests
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TRAVELPAYOUTS_TOKEN")
BASE = "https://api.travelpayouts.com"

def ucuz_ucuslar_getir(origin: str) -> dict:
    r = requests.get(f"{BASE}/v1/city-directions", params={
        "origin": origin, "currency": "try", "token": TOKEN
    })
    if r.ok:
        return r.json().get("data", {})
    return {}

def aylik_matris_getir(origin: str, varis: str) -> list:
    r = requests.get(f"{BASE}/v2/prices/month-matrix", params={
        "origin": origin, "destination": varis,
        "currency": "try", "token": TOKEN
    })
    if r.ok:
        return r.json().get("data", [])
    return []

def ozel_firsatlar_getir(origin: str) -> list:
    r = requests.get(f"{BASE}/aviasales/v3/get_special_offers", params={
        "origin": origin, "locale": "tr", "token": TOKEN
    })
    if r.ok:
        return r.json().get("data", [])
    return []

def alternatif_tarihler_getir(origin: str, destination: str) -> list:
    """Aylik matris API'den ayni rota icin farkli tarihlerdeki ucuz fiyatlari getirir."""
    r = requests.get(f"{BASE}/v2/prices/month-matrix", params={
        "origin": origin, "destination": destination,
        "currency": "try", "token": TOKEN,
        "show_to_affiliates": "true"
    })
    if r.ok:
        data = r.json().get("data", [])
        sonuclar = []
        for d in data:
            if d.get("price") and d.get("depart_date"):
                sonuclar.append({
                    "ucus_tarihi": d["depart_date"],
                    "donus_tarihi": d.get("return_date", ""),
                    "fiyat": d["price"]
                })
        sonuclar.sort(key=lambda x: x["fiyat"])
        return sonuclar[:6]
    return []


def otel_bul(sehir: str, checkin: str, gece: int,
             yildiz: int = 3, cocuklu: bool = False,
             butce_kalan: int = 5000) -> list:
    r = requests.get(f"{BASE}/hotellook/v1/cache/hotels", params={
        "location": sehir, "checkIn": checkin,
        "duration": gece, "stars": yildiz,
        "currency": "try", "token": TOKEN,
        "limit": 5
    })
    if r.ok:
        return r.json() if isinstance(r.json(), list) else []
    return []
