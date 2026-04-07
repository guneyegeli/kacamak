"""Ucuza Gezen Doktor kanalı — destinasyon bazlı video mapping."""

KANAL = "ucuzagezendoktor"
KANAL_URL = "https://www.youtube.com/@ucuzagezendoktor"

# IATA kodu → video bilgisi
# Video ID'leri kanaldan elle eşleştirilmiştir
KANAL_VIDEOLARI = {
    # Azerbaycan — Bakü
    "BAK": {"id": "jyVDft_G9fE", "baslik": "Bakü'yü 2 Günde Baştan Sona Gezdim — Tam Rehber"},
    "GYD": {"id": "jyVDft_G9fE", "baslik": "Bakü'yü 2 Günde Baştan Sona Gezdim — Tam Rehber"},
    # Fas — Kazablanka / Marakeş
    "CMN": {"id": "AjLFu6qcjXc", "baslik": "Fas'ta Gezilmesi Gereken İki Şehir: Şafşavan & Casablanca"},
    # Danimarka — Kopenhag
    "CPH": {"id": "fUArULXkJ6c", "baslik": "Kopenhag — Yeme, İçme, Konaklama ve Gezi Rehberi"},
    # Finlandiya — Helsinki
    "HEL": {"id": "dg_X58RIwLw", "baslik": "Helsinki — En Mutlu İnsanların Yaşadığı Şehri Ucuza Gezdim"},
    # Hindistan — Delhi
    "DEL": {"id": "oG3ZJiz4A3U", "baslik": "Delhi Sokaklarında Kayboldum — Sokak Yemekleri, Kaos ve Pazarlar"},
}


def kanal_videosu_getir(destinasyon: str) -> dict | None:
    """Varış IATA kodu için kanal videosu döndürür. Yoksa None."""
    return KANAL_VIDEOLARI.get(destinasyon.upper())
