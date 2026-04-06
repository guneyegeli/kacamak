SEHIR_VIDEOLARI = {
    "Istanbul": [
        {"id": "YKVMwfjueHo", "baslik": "Istanbul Gezi Rehberi"},
        {"id": "3rx9W2qPfJg", "baslik": "Istanbul'da 3 Gun"},
    ],
    "Paris": [
        {"id": "cyBO_8W-MBM", "baslik": "Paris Gezi Rehberi"},
        {"id": "Ka9gTXjPn_E", "baslik": "Paris'te Yapilacak 25 Sey"},
    ],
    "Rome": [
        {"id": "LHnkMFJTEMI", "baslik": "Roma Gezi Rehberi"},
        {"id": "I-sDzaWYyWo", "baslik": "Roma'da 3 Gun"},
    ],
    "Barcelona": [
        {"id": "sKVYsFidAbw", "baslik": "Barcelona Gezi Rehberi"},
        {"id": "xa-KBqOFgDQ", "baslik": "Barcelona Top 10"},
        {"id": "aiK3NHBiaBw", "baslik": "Barcelona Yuruyus Turu"},
    ],
    "Amsterdam": [
        {"id": "v2b7Cp3xsWo", "baslik": "Amsterdam Gezi Rehberi"},
        {"id": "Ggri0Oqmuns", "baslik": "Amsterdam'da 2 Gun"},
    ],
    "London": [
        {"id": "BkGHt4DQGFA", "baslik": "Londra Gezi Rehberi"},
        {"id": "Aj1UrwPQxOY", "baslik": "Londra'da Yapilacaklar"},
    ],
    "Prague": [
        {"id": "1-MFBnwPoHg", "baslik": "Prag Gezi Rehberi"},
        {"id": "y5gVivxjhBk", "baslik": "Prag'da 2 Gun"},
    ],
    "Athens": [
        {"id": "5rIDBJOvSss", "baslik": "Atina Gezi Rehberi"},
        {"id": "abpNt48t8FA", "baslik": "Atina'da 3 Gun"},
    ],
    "Budapest": [
        {"id": "gGfzGUqKL6Y", "baslik": "Budapes Gezi Rehberi"},
        {"id": "jv2nJLEfOEo", "baslik": "Budapes'te 3 Gun"},
    ],
    "Vienna": [
        {"id": "d7v2VOvJmCE", "baslik": "Viyana Gezi Rehberi"},
        {"id": "nN_u6QZU7KI", "baslik": "Viyana'da 2 Gun"},
    ],
    "Lisbon": [
        {"id": "BnaRgPtYSqo", "baslik": "Lizbon Gezi Rehberi"},
        {"id": "e3WwYDTgesA", "baslik": "Lizbon'da 3 Gun"},
    ],
    "Dubai": [
        {"id": "j7ysfMhTFV8", "baslik": "Dubai Gezi Rehberi"},
        {"id": "KfrFZu6x4Rg", "baslik": "Dubai'de 4 Gun"},
    ],
    "Berlin": [
        {"id": "uxXiCpNf1z0", "baslik": "Berlin Gezi Rehberi"},
        {"id": "fN3dowKr2tw", "baslik": "Berlin'de 3 Gun"},
    ],
    "Madrid": [
        {"id": "zAMumNyoRss", "baslik": "Madrid Gezi Rehberi"},
        {"id": "nK8dZFz8VNE", "baslik": "Madrid'de 2 Gun"},
    ],
    "Milan": [
        {"id": "HgXnAjbjLBM", "baslik": "Milano Gezi Rehberi"},
        {"id": "fJrLwJQvJzI", "baslik": "Milano'da 2 Gun"},
    ],
    "Izmir": [
        {"id": "7CXQa-6fPPs", "baslik": "Izmir Gezi Rehberi"},
    ],
    "Antalya": [
        {"id": "dFpEy_CTQBA", "baslik": "Antalya Gezi Rehberi"},
    ],
}


def videolar_getir(destinasyon: str) -> list:
    from services.unsplash import SEHIR_ISIMLERI
    sehir = SEHIR_ISIMLERI.get(destinasyon.upper(), destinasyon)
    return SEHIR_VIDEOLARI.get(sehir, [])
