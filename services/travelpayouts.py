import requests
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TRAVELPAYOUTS_TOKEN")
BASE = "https://api.travelpayouts.com"

def ucuz_ucuslar_getir(origin: str, limit: int = 30) -> dict:
    """En ucuz uçuşları çeker. API hangi destinasyonu bulursa döndürür."""
    r = requests.get(f"{BASE}/v2/prices/latest", params={
        "origin": origin, "currency": "try",
        "limit": limit, "sorting": "price",
        "token": TOKEN,
    }, timeout=10)
    if r.ok:
        # /v2/prices/latest liste döndürür, varış bazlı dict'e çevir
        data = r.json().get("data", [])
        sonuc = {}
        for d in data:
            varis = d.get("destination")
            if not varis:
                continue
            # Aynı varış için en ucuzunu tut
            if varis not in sonuc or d.get("value", 0) < sonuc[varis].get("price", 0):
                sonuc[varis] = {
                    "price": d.get("value", 0),
                    "airline": d.get("airline", ""),
                    "departure_at": d.get("depart_date", ""),
                    "return_at": d.get("return_date", ""),
                    "expires_at": d.get("found_at", ""),
                    "aktarma": d.get("number_of_changes", 0),
                    "sure_dk": d.get("duration", 0),  # toplam gidiş-dönüş dakika
                    "mesafe_km": d.get("distance", 0),
                    "gate": d.get("gate", ""),
                }
        return sonuc
    return {}

def aylik_matris_getir(origin: str, varis: str) -> list:
    r = requests.get(f"{BASE}/v2/prices/month-matrix", params={
        "origin": origin, "destination": varis,
        "currency": "try", "token": TOKEN
    }, timeout=10)
    if r.ok:
        return r.json().get("data", [])
    return []

def ozel_firsatlar_getir(origin: str) -> list:
    r = requests.get(f"{BASE}/aviasales/v3/get_special_offers", params={
        "origin": origin, "locale": "tr", "token": TOKEN
    }, timeout=10)
    if r.ok:
        return r.json().get("data", [])
    return []

def alternatif_tarihler_getir(origin: str, destination: str) -> list:
    """Aylik matris API'den ayni rota icin farkli tarihlerdeki ucuz fiyatlari getirir."""
    r = requests.get(f"{BASE}/v2/prices/month-matrix", params={
        "origin": origin, "destination": destination,
        "currency": "try", "token": TOKEN,
        "show_to_affiliates": "true"
    }, timeout=10)
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
    }, timeout=10)
    if r.ok:
        return r.json() if isinstance(r.json(), list) else []
    return []
