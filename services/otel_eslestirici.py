"""Fırsat için otel fiyat tahmini oluşturur ve DB'ye kaydeder.

Hotellook API erişilemez olduğunda bölge bazlı tahmin kullanır.
API erişilebilir olduğunda otomatik olarak gerçek veriye geçer.
"""
import sqlite3
import os
import logging
from datetime import datetime

from services.koordinat import sehir_adi_getir
from services.bolge import bolge_bul, YURTICI

DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
log = logging.getLogger("otel_eslestirici")

# Bölge bazlı gecelik otel fiyat tahmini (TRY, 2-3 yıldız ekonomik)
# Kaynak: genel piyasa ortalamaları
BOLGE_GECELIK_FIYAT = {
    # Yurtiçi
    'yurtici_ucuz': 600,     # Küçük şehirler
    'yurtici_orta': 900,     # Ankara, İzmir
    'yurtici_pahali': 1200,  # İstanbul, Antalya, Bodrum

    # Yakın Avrupa / Balkanlar
    'balkan': 700,           # Belgrad, Üsküp, Tiran, Saraybosna
    'dogu_avrupa': 900,      # Budapeşte, Prag, Varşova, Bükreş

    # Batı Avrupa
    'bati_avrupa': 1500,     # Paris, Londra, Amsterdam, Roma
    'guney_avrupa': 1100,    # Barselona, Lizbon, Atina

    # Kafkasya
    'kafkasya': 500,         # Tiflis, Bakü

    # Orta Doğu
    'ortadogu': 1200,        # Dubai, Doha
    'ortadogu_ucuz': 600,    # Amman, Kahire

    # Uzak
    'uzak_ucuz': 400,        # Güneydoğu Asya (Bangkok, Bali)
    'uzak_pahali': 2000,     # Japonya, Singapur
    'amerika': 2500,         # ABD, Kanada

    # Varsayılan
    'varsayilan': 800,
}

# IATA → fiyat kategorisi mapping
IATA_FIYAT = {
    # Yurtiçi pahalı
    'IST': 'yurtici_pahali', 'SAW': 'yurtici_pahali', 'AYT': 'yurtici_pahali',
    'BJV': 'yurtici_pahali', 'DLM': 'yurtici_pahali',
    # Yurtiçi orta
    'ADB': 'yurtici_orta', 'ESB': 'yurtici_orta', 'GZT': 'yurtici_orta',
    'ADA': 'yurtici_orta', 'TZX': 'yurtici_orta', 'KYA': 'yurtici_orta',
    # Balkanlar
    'BEG': 'balkan', 'SKP': 'balkan', 'TIA': 'balkan', 'SJJ': 'balkan',
    'SOF': 'balkan', 'TGD': 'balkan', 'TIV': 'balkan', 'PRN': 'balkan',
    # Doğu Avrupa
    'BUD': 'dogu_avrupa', 'PRG': 'dogu_avrupa', 'WAW': 'dogu_avrupa',
    'OTP': 'dogu_avrupa', 'ZAG': 'dogu_avrupa', 'VIE': 'dogu_avrupa',
    # Batı Avrupa
    'PAR': 'bati_avrupa', 'CDG': 'bati_avrupa', 'LHR': 'bati_avrupa',
    'LON': 'bati_avrupa', 'AMS': 'bati_avrupa', 'BRU': 'bati_avrupa',
    'ZRH': 'bati_avrupa', 'DUB': 'bati_avrupa', 'CPH': 'bati_avrupa',
    'OSL': 'bati_avrupa', 'ARN': 'bati_avrupa', 'HEL': 'bati_avrupa',
    'FRA': 'bati_avrupa', 'MUC': 'bati_avrupa', 'BER': 'bati_avrupa',
    'MXP': 'bati_avrupa', 'FCO': 'bati_avrupa', 'ROM': 'bati_avrupa',
    # Güney Avrupa
    'BCN': 'guney_avrupa', 'MAD': 'guney_avrupa', 'LIS': 'guney_avrupa',
    'ATH': 'guney_avrupa', 'NAP': 'guney_avrupa',
    # Kafkasya
    'TBS': 'kafkasya', 'GYD': 'kafkasya', 'BAK': 'kafkasya',
    'GNJ': 'kafkasya', 'EVN': 'kafkasya',
    # Orta Doğu pahalı
    'DXB': 'ortadogu', 'DOH': 'ortadogu', 'RUH': 'ortadogu',
    'JED': 'ortadogu', 'MED': 'ortadogu', 'MCT': 'ortadogu',
    'BAH': 'ortadogu', 'KWI': 'ortadogu',
    # Orta Doğu ucuz
    'AMM': 'ortadogu_ucuz', 'BEY': 'ortadogu_ucuz', 'TLV': 'ortadogu_ucuz',
    'CAI': 'ortadogu_ucuz', 'SSH': 'ortadogu_ucuz', 'HRG': 'ortadogu_ucuz',
    'CMN': 'ortadogu_ucuz', 'RAK': 'ortadogu_ucuz', 'TUN': 'ortadogu_ucuz',
    # Uzak ucuz
    'BKK': 'uzak_ucuz', 'HKT': 'uzak_ucuz', 'KUL': 'uzak_ucuz',
    'DPS': 'uzak_ucuz', 'MNL': 'uzak_ucuz', 'CMB': 'uzak_ucuz',
    'DEL': 'uzak_ucuz', 'BOM': 'uzak_ucuz', 'MLE': 'uzak_ucuz',
    # Uzak pahalı
    'SIN': 'uzak_pahali', 'HND': 'uzak_pahali', 'NRT': 'uzak_pahali',
    'ICN': 'uzak_pahali', 'HKG': 'uzak_pahali', 'PEK': 'uzak_pahali',
    'SYD': 'uzak_pahali', 'MEL': 'uzak_pahali',
    # Amerika
    'JFK': 'amerika', 'LAX': 'amerika', 'MIA': 'amerika', 'SFO': 'amerika',
    'ORD': 'amerika', 'ATL': 'amerika', 'YYZ': 'amerika',
    'MEX': 'ortadogu_ucuz', 'CUN': 'ortadogu',
    'GRU': 'ortadogu', 'GIG': 'ortadogu', 'EZE': 'ortadogu',
    # Kıbrıs
    'ECN': 'yurtici_orta', 'LCA': 'yurtici_orta', 'PFO': 'yurtici_orta',
    # Rusya
    'MOW': 'dogu_avrupa', 'LED': 'dogu_avrupa', 'AER': 'kafkasya',
    'KRR': 'kafkasya',
    # Orta Asya
    'TAS': 'kafkasya', 'BSZ': 'kafkasya', 'NQZ': 'kafkasya',
    'ALA': 'kafkasya', 'SKD': 'kafkasya',
}


def _gecelik_tahmin(varis: str) -> int:
    """IATA koduna göre tahmini gecelik otel fiyatı (TRY)."""
    kategori = IATA_FIYAT.get(varis)
    if kategori:
        return BOLGE_GECELIK_FIYAT[kategori]
    if varis in YURTICI:
        return BOLGE_GECELIK_FIYAT['yurtici_ucuz']
    return BOLGE_GECELIK_FIYAT['varsayilan']


def _otel_api_dene(varis_sehir: str, ucus_tarihi: str, gece: int) -> dict | None:
    """Travelpayouts Hotellook API'den otel verisi çekmeyi dener.
    API erişilemezse None döner."""
    try:
        from services.travelpayouts import otel_bul
        oteller = otel_bul(varis_sehir, ucus_tarihi, gece)
        if not oteller:
            return None
        en_ucuz = None
        for otel in oteller:
            fiyat = otel.get("priceFrom") or otel.get("price")
            if fiyat and (en_ucuz is None or fiyat < en_ucuz.get("fiyat", 999999)):
                en_ucuz = {
                    "fiyat": int(fiyat),
                    "ad": otel.get("hotelName") or otel.get("name", ""),
                    "yildiz": otel.get("stars") or otel.get("star"),
                    "id": str(otel.get("hotelId") or otel.get("id") or ""),
                }
        return en_ucuz
    except Exception:
        return None


def firsat_icin_otel_getir(firsat: dict) -> dict | None:
    """Tek bir fırsat için otel fiyat bilgisi çeker.
    Sadece API'den gerçek veri gelirse kaydeder. Tahmin kullanmaz."""
    varis = firsat.get("varis", "")
    varis_sehir = firsat.get("varis_sehir") or sehir_adi_getir(varis)
    ucus_tarihi = firsat.get("ucus_tarihi", "")
    donus_tarihi = firsat.get("donus_tarihi", "")
    ucus_fiyat = firsat.get("fiyat", 0) or 0

    if not varis_sehir or not ucus_tarihi:
        return None

    # Gece sayısı hesapla
    gece = 3
    if ucus_tarihi and donus_tarihi:
        try:
            g = datetime.strptime(ucus_tarihi, "%Y-%m-%d")
            d = datetime.strptime(donus_tarihi, "%Y-%m-%d")
            gece = max((d - g).days, 1)
        except ValueError:
            pass

    # API'den gerçek otel verisi çek
    api_sonuc = _otel_api_dene(varis_sehir, ucus_tarihi, gece)

    if not api_sonuc:
        return None  # Tahmin kullanma — sadece gerçek veri

    otel_min_fiyat = api_sonuc["fiyat"]
    otel_toplam = otel_min_fiyat * gece
    toplam_tahmini = ucus_fiyat + otel_toplam

    return {
        "otel_min_fiyat": otel_min_fiyat,
        "otel_toplam": otel_toplam,
        "otel_adi": api_sonuc["ad"],
        "otel_yildiz": api_sonuc.get("yildiz"),
        "toplam_tahmini": toplam_tahmini,
        "otel_id": api_sonuc.get("id") or None,
    }


def firsat_otel_kaydet(firsat_id: int, otel: dict):
    """Otel bilgisini firsatlar tablosuna kaydeder."""
    conn = sqlite3.connect(DB)
    try:
        conn.execute("""
            UPDATE firsatlar
            SET otel_min_fiyat=?, otel_toplam=?, otel_adi=?,
                otel_yildiz=?, toplam_tahmini=?, otel_id=?
            WHERE id=?
        """, (
            otel["otel_min_fiyat"], otel["otel_toplam"],
            otel["otel_adi"], otel.get("otel_yildiz"),
            otel["toplam_tahmini"], otel.get("otel_id"),
            firsat_id,
        ))
        conn.commit()
    finally:
        conn.close()


def firsat_otel_isle(firsat: dict):
    """Fırsat için otel bilgisi üretip DB'ye kaydeder."""
    firsat_id = firsat.get("id")
    if not firsat_id:
        return
    otel = firsat_icin_otel_getir(firsat)
    if otel:
        firsat_otel_kaydet(firsat_id, otel)
        log.info("Otel kaydedildi: firsat #%d %s→%s %d₺/gece toplam %d₺",
                 firsat_id, firsat.get("cikis"), firsat.get("varis"),
                 otel["otel_min_fiyat"], otel["toplam_tahmini"])


def mevcut_firsatlari_guncelle(limit: int = 50):
    """Otel verisi olmayan aktif fırsatlar için toplu güncelleme."""
    conn = sqlite3.connect(DB)
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT * FROM firsatlar
            WHERE otel_min_fiyat IS NULL
            AND aktif = 1
            AND ucus_tarihi >= date('now')
            AND ucus_tarihi IS NOT NULL
            ORDER BY olusturulma DESC
            LIMIT ?
        """, (limit,)).fetchall()
    finally:
        conn.close()

    guncellenen = 0
    for r in rows:
        firsat_otel_isle(dict(r))
        guncellenen += 1

    log.info("Otel güncelleme: %d/%d fırsat işlendi", guncellenen, len(rows))
    return guncellenen
