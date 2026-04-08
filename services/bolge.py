"""Varış IATA koduna göre bölge tespiti ve süre limitleri."""

# Türkiye iç hat havaalanları
YURTICI = {
    'AYT', 'DLM', 'ADB', 'ESB', 'TZX', 'GZT', 'ADA', 'BJV', 'NAV', 'VAN',
    'ERZ', 'SZF', 'DIY', 'IST', 'SAW', 'IZM', 'ANK', 'COV', 'GZP', 'TRS',
    'KYA', 'MLX', 'EZS', 'ASR', 'NOP', 'ONQ', 'HTY', 'GNY', 'MQM', 'IGD',
    'MSR', 'KSY', 'EDO', 'CKZ', 'TEQ', 'USQ', 'DNZ', 'ISE', 'AFY', 'BZI',
    'YEI', 'RZV', 'VAS',
}

# Avrupa ülkeleri
AVRUPA = {
    'BCN', 'CDG', 'PAR', 'AMS', 'FCO', 'ROM', 'LHR', 'LON', 'PRG', 'BUD',
    'VIE', 'ATH', 'LIS', 'MUC', 'BER', 'WAW', 'ZAG', 'OTP', 'SOF', 'BEG',
    'SKP', 'TIA', 'MAD', 'MXP', 'DUB', 'CPH', 'OSL', 'ARN', 'HEL', 'ZRH',
    'BRU', 'TGD', 'TIV', 'SKD', 'SJJ',
    # Rusya (Avrupa yakını)
    'MOW', 'LED', 'KRR', 'AER', 'MRV', 'MCX', 'KZN', 'RMO', 'SVX',
    'GRV', 'OGZ', 'CEK', 'UFA', 'PEE', 'GOJ', 'KGD', 'RTW',
    # Orta Asya (Avrupa yakını)
    'BSZ', 'TAS', 'NQZ', 'ALA', 'MSQ', 'CIT', 'OMS', 'KJA', 'TJM', 'OSS',
    'ECN',
}

# Yakın bölgeler (Kafkasya, Orta Doğu, Kuzey Afrika)
YAKIN = {
    'TBS', 'GYD', 'BAK',  # Kafkasya
    'TLV', 'BEY',  # İsrail, Lübnan
    'CAI', 'SSH', 'HRG',  # Mısır
    'CMN', 'TUN',  # Fas, Tunus
    'JED', 'MED', 'DXB', 'DOH',  # Orta Doğu
    'GNJ',  # Azerbaycan
}

# Birleşik set: Avrupa + Yakın (aynı süre limiti)
AVRUPA_YAKIN = AVRUPA | YAKIN

# Süre limitleri (gece): (varsayılan, maksimum)
SURE_LIMITLERI = {
    'yurtici': (3, 7),
    'avrupa_yakin': (5, 10),
    'uzak': (10, 60),
}


def bolge_bul(varis: str) -> str:
    """Varış IATA koduna göre bölge döndürür."""
    if varis in YURTICI:
        return 'yurtici'
    if varis in AVRUPA_YAKIN:
        return 'avrupa_yakin'
    return 'uzak'


def maks_gece(varis: str) -> int:
    """Varış koduna göre maksimum gece sayısını döndürür."""
    return SURE_LIMITLERI[bolge_bul(varis)][1]


def varsayilan_gece(varis: str) -> int:
    """Varış koduna göre varsayılan gece sayısını döndürür."""
    return SURE_LIMITLERI[bolge_bul(varis)][0]
