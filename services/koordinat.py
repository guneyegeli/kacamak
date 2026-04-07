SEHIR_KOORDINATLARI = {
    "IST": {"isim": "Istanbul", "lat": 41.0082, "lon": 28.9784},
    "SAW": {"isim": "Istanbul", "lat": 41.0082, "lon": 28.9784},
    "ADB": {"isim": "Izmir", "lat": 38.4237, "lon": 27.1428},
    "AYT": {"isim": "Antalya", "lat": 36.8969, "lon": 30.7133},
    "ESB": {"isim": "Ankara", "lat": 39.9334, "lon": 32.8597},
    "ADA": {"isim": "Adana", "lat": 37.0000, "lon": 35.3213},
    "LHR": {"isim": "London", "lat": 51.5074, "lon": -0.1278},
    "CDG": {"isim": "Paris", "lat": 48.8566, "lon": 2.3522},
    "FCO": {"isim": "Rome", "lat": 41.9028, "lon": 12.4964},
    "BCN": {"isim": "Barcelona", "lat": 41.3874, "lon": 2.1686},
    "AMS": {"isim": "Amsterdam", "lat": 52.3676, "lon": 4.9041},
    "BER": {"isim": "Berlin", "lat": 52.5200, "lon": 13.4050},
    "ATH": {"isim": "Athens", "lat": 37.9838, "lon": 23.7275},
    "VIE": {"isim": "Vienna", "lat": 48.2082, "lon": 16.3738},
    "PRG": {"isim": "Prague", "lat": 50.0755, "lon": 14.4378},
    "BUD": {"isim": "Budapest", "lat": 47.4979, "lon": 19.0402},
    "WAW": {"isim": "Warsaw", "lat": 52.2297, "lon": 21.0122},
    "LIS": {"isim": "Lisbon", "lat": 38.7223, "lon": -9.1393},
    "DUB": {"isim": "Dublin", "lat": 53.3498, "lon": -6.2603},
    "CPH": {"isim": "Copenhagen", "lat": 55.6761, "lon": 12.5683},
    "OSL": {"isim": "Oslo", "lat": 59.9139, "lon": 10.7522},
    "ARN": {"isim": "Stockholm", "lat": 59.3293, "lon": 18.0686},
    "HEL": {"isim": "Helsinki", "lat": 60.1699, "lon": 24.9384},
    "ZRH": {"isim": "Zurich", "lat": 47.3769, "lon": 8.5417},
    "BRU": {"isim": "Brussels", "lat": 50.8503, "lon": 4.3517},
    "MXP": {"isim": "Milan", "lat": 45.4642, "lon": 9.1900},
    "MAD": {"isim": "Madrid", "lat": 40.4168, "lon": -3.7038},
    "MUC": {"isim": "Munich", "lat": 48.1351, "lon": 11.5820},
    "TBS": {"isim": "Tbilisi", "lat": 41.7151, "lon": 44.8271},
    "GYD": {"isim": "Baku", "lat": 40.4093, "lon": 49.8671},
    "DXB": {"isim": "Dubai", "lat": 25.2048, "lon": 55.2708},
    "DOH": {"isim": "Doha", "lat": 25.2854, "lon": 51.5310},
    "CAI": {"isim": "Cairo", "lat": 30.0444, "lon": 31.2357},
    "CMN": {"isim": "Casablanca", "lat": 33.5731, "lon": -7.5898},
    "TUN": {"isim": "Tunis", "lat": 36.8065, "lon": 10.1815},
    "SSH": {"isim": "Sharm el Sheikh", "lat": 27.9158, "lon": 34.3300},
    "JFK": {"isim": "New York", "lat": 40.7128, "lon": -74.0060},
    "LAX": {"isim": "Los Angeles", "lat": 34.0522, "lon": -118.2437},
    "BKK": {"isim": "Bangkok", "lat": 13.7563, "lon": 100.5018},
    "HND": {"isim": "Tokyo", "lat": 35.6762, "lon": 139.6503},
    "ICN": {"isim": "Seoul", "lat": 37.5665, "lon": 126.9780},
    "SIN": {"isim": "Singapore", "lat": 1.3521, "lon": 103.8198},
}


# IATA → Türkçe şehir adı (itinerary, bildirim, UI için)
SEHIR_ADLARI = {
    # Türkiye
    "IST": "İstanbul", "SAW": "İstanbul", "ADB": "İzmir", "AYT": "Antalya",
    "ESB": "Ankara", "ADA": "Adana", "DLM": "Dalaman", "BJV": "Bodrum",
    "NAV": "Nevşehir", "GZP": "Trabzon", "TZX": "Trabzon", "GZT": "Gaziantep",
    "VAN": "Van", "ERZ": "Erzurum", "TRS": "Trabzon", "SZF": "Samsun",
    "IZM": "İzmir", "ANK": "Ankara", "COV": "Konya", "DIY": "Diyarbakır",
    # Rusya
    "MOW": "Moskova", "LED": "St. Petersburg", "KRR": "Krasnodar", "AER": "Soçi",
    "MRV": "Mineralnye Vody", "MCX": "Mahaçkale", "KZN": "Kazan", "RMO": "Rostov",
    "SVX": "Yekaterinburg", "GRV": "Grozny", "OGZ": "Vladikavkaz",
    "CEK": "Çelyabinsk", "UFA": "Ufa", "PEE": "Perm", "GOJ": "Nijniy Novgorod",
    "OMS": "Omsk", "KJA": "Krasnoyarsk", "TJM": "Tümen", "KGD": "Kaliningrad",
    "RTW": "Saratov", "OVB": "Novosibirsk", "KUF": "Samara",
    # Avrupa
    "PAR": "Paris", "CDG": "Paris", "BCN": "Barselona", "ROM": "Roma", "FCO": "Roma",
    "ATH": "Atina", "BUD": "Budapeşte", "PRG": "Prag", "VIE": "Viyana",
    "BER": "Berlin", "AMS": "Amsterdam", "LHR": "Londra", "LON": "Londra",
    "LIS": "Lizbon", "MAD": "Madrid", "MXP": "Milano", "MUC": "Münih",
    "DUB": "Dublin", "CPH": "Kopenhag", "OSL": "Oslo", "ARN": "Stockholm",
    "HEL": "Helsinki", "ZRH": "Zürih", "BRU": "Brüksel", "WAW": "Varşova",
    "BEG": "Belgrad", "TGD": "Podgorica", "TIV": "Tivat", "SKD": "Semerkand",
    # Kafkasya / Orta Doğu
    "TBS": "Tiflis", "GYD": "Bakü", "BAK": "Bakü", "GNJ": "Gence",
    "JED": "Cidde", "MED": "Medine", "DXB": "Dubai", "DOH": "Doha",
    "TLV": "Tel Aviv", "BEY": "Beyrut",
    # Kuzey Afrika
    "CAI": "Kahire", "SSH": "Şarm El Şeyh", "CMN": "Kazablanka", "TUN": "Tunus",
    # Orta Asya
    "TAS": "Taşkent", "BSZ": "Bişkek", "NQZ": "Nursultan", "ALA": "Almatı",
    "MSQ": "Minsk", "CIT": "Şımkent", "OSS": "Oş", "ECN": "Lefkoşa",
    # Uzak
    "BKK": "Bangkok", "HND": "Tokyo", "ICN": "Seul", "SIN": "Singapur",
    "JFK": "New York", "LAX": "Los Angeles",
}


def sehir_adi_getir(iata_kodu: str) -> str:
    """IATA kodundan Türkçe şehir adı döndürür. Bulamazsa kodu döndürür."""
    return SEHIR_ADLARI.get(iata_kodu.upper(), iata_kodu)


def koordinat_getir(iata_kodu: str) -> dict | None:
    return SEHIR_KOORDINATLARI.get(iata_kodu.upper())


def harita_embed_url(iata_kodu: str, zoom: float = 0.05) -> str | None:
    k = koordinat_getir(iata_kodu)
    if not k:
        return None
    lon1 = k["lon"] - zoom * 2
    lat1 = k["lat"] - zoom
    lon2 = k["lon"] + zoom * 2
    lat2 = k["lat"] + zoom
    return (
        f"https://www.openstreetmap.org/export/embed.html"
        f"?bbox={lon1},{lat1},{lon2},{lat2}&layer=mapnik"
        f"&marker={k['lat']},{k['lon']}"
    )
