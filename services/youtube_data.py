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
    "Tbilisi": [
        {"id": "L3T3pOBnLzI", "baslik": "Tiflis Gezi Rehberi"},
        {"id": "cVE4sPfqz8c", "baslik": "Tiflis'te 3 Gun"},
    ],
    "Baku": [
        {"id": "L3K4eTYJbl0", "baslik": "Baku Gezi Rehberi"},
    ],
    "Moscow": [
        {"id": "6TlZ-L_KYk0", "baslik": "Moskova Gezi Rehberi"},
    ],
    "Sharm el Sheikh": [
        {"id": "hGXlNx2-U9s", "baslik": "Sarm El Seyh Gezi Rehberi"},
    ],
    "Cairo": [
        {"id": "HSxzMfIcZVY", "baslik": "Kahire Gezi Rehberi"},
    ],
    "Bangkok": [
        {"id": "bKoMugi2N3s", "baslik": "Bangkok Gezi Rehberi"},
    ],
}

# Türkçe isimlerle de erişilebilsin
_TR_ALIAS = {
    "Roma": "Rome", "Londra": "London", "Atina": "Athens",
    "Barselona": "Barcelona", "Budapeşte": "Budapest", "Viyana": "Vienna",
    "Lizbon": "Lisbon", "Prag": "Prague", "Münih": "Munich",
    "Milano": "Milan", "Moskova": "Moscow", "Tiflis": "Tbilisi",
    "Bakü": "Baku", "Kahire": "Cairo", "Şarm El Şeyh": "Sharm el Sheikh",
    "İstanbul": "Istanbul",
}
for tr, en in _TR_ALIAS.items():
    if en in SEHIR_VIDEOLARI and tr not in SEHIR_VIDEOLARI:
        SEHIR_VIDEOLARI[tr] = SEHIR_VIDEOLARI[en]


def videolar_getir(destinasyon: str) -> list:
    from services.koordinat import sehir_adi_getir, SEHIR_KOORDINATLARI
    kod = destinasyon.upper()
    # Önce Türkçe isimle dene, sonra koordinat.py'deki İngilizce isimle
    tr_isim = sehir_adi_getir(kod)
    if tr_isim in SEHIR_VIDEOLARI:
        return SEHIR_VIDEOLARI[tr_isim]
    koord = SEHIR_KOORDINATLARI.get(kod)
    if koord and koord["isim"] in SEHIR_VIDEOLARI:
        return SEHIR_VIDEOLARI[koord["isim"]]
    return []
