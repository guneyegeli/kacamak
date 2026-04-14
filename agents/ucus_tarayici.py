import sqlite3
import os
import logging
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from services.travelpayouts import ucuz_ucuslar_getir, aylik_matris_getir, alternatif_tarihler_getir, hedef_ucuslar_getir
from services.eslestirici import firsat_icin_kullanicilar_bul
from services.firebase_service import bildirim_gonder
from agents.itinerary_uretici import itinerary_olustur
from services.bolge import bolge_bul, maks_gece, varsayilan_gece, YURTICI, UZAK_DESTINASYONLAR
from services.koordinat import sehir_adi_getir

load_dotenv()
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
INDIRIM_ESIGI = 0.80  # %20 indirim eşiği (fiyat < normal * 0.80)
INDIRIM_ESIGI_UZAK = 0.85  # Uzak rotalar için %15 indirim eşiği (zaten pahalı)
ILK_TARAMA_EN_UCUZ = 10  # Geçmiş veri yoksa en ucuz N uçuşu kaydet
API_BEKLEME = 2  # Havalimanları arası bekleme süresi (saniye) — rate limit koruması

# Sadece büyük hub'lardan uzak rota tarası yap (küçük havalimanlarından direkt uçuş yok)
UZAK_HUBLAR = {'IST', 'SAW', 'ADB', 'AYT', 'ESB'}

# Türkiye'nin uluslararası uçuş yapan tüm havalimanları
HAVAALANLARI = [
    # Büyük hub'lar
    "IST", "SAW", "ADB", "AYT", "ESB",
    # Karadeniz
    "TZX", "SZF", "OGU",
    # Güneydoğu / Doğu
    "GZT", "ADA", "DIY", "VAN", "ERZ", "MLX", "EZS", "HTY", "GNY", "MQM",
    "IGD", "MSR", "KSY",
    # Ege / Akdeniz
    "BJV", "DLM", "DNZ",
    # İç Anadolu
    "KYA", "ASR",
    # Marmara / Batı
    "EDO", "CKZ", "TEQ", "BZI",
    # Diğer
    "USQ", "ISE", "AFY", "NOP", "ONQ",
]

log = logging.getLogger("ucus_tarayici")

# Travelpayouts şehir verileri cache'i (tarama boyunca bir kez yüklenir)
_sehir_cache = None


def _travelpayouts_sehir_adi(iata_kodu: str) -> str | None:
    """Travelpayouts cities API'den şehir adı çeker. Bulamazsa None döndürür."""
    global _sehir_cache
    if _sehir_cache is None:
        try:
            import requests
            r = requests.get(
                "https://api.travelpayouts.com/data/en/cities.json",
                timeout=10
            )
            if r.ok:
                _sehir_cache = {c["code"]: c.get("name", "") for c in r.json() if c.get("code")}
            else:
                _sehir_cache = {}
        except Exception as e:
            log.warning("Travelpayouts cities API hatası: %s", e)
            _sehir_cache = {}
    return _sehir_cache.get(iata_kodu) or None


# Tarama istatistikleri
istatistik = {"rota": 0, "fiyat_kaydedilen": 0, "firsat": 0}


def _bildirim_gonderilebilir_mi(kullanici: dict, firsat: dict) -> bool:
    """Kullanıcının bildirim tercihlerine göre gönderilip gönderilemeyeceğini kontrol eder."""
    # Bildirim kapalı
    if not kullanici.get("bildirim_aktif", 1):
        return False

    # Minimum indirim eşiği
    esik = kullanici.get("min_indirim_esigi") or 30
    if (firsat.get("indirim_orani") or 0) < esik:
        return False

    # Yurtiçi / yurtdışı filtresi
    varis = firsat.get("varis", "")
    yurtici_mi = varis in YURTICI
    if yurtici_mi and not kullanici.get("yurtici_bildirim", 1):
        return False
    if not yurtici_mi and not kullanici.get("yurtdisi_bildirim", 1):
        return False

    # Sessiz saatler kontrolü
    sessiz_bas = kullanici.get("sessiz_baslangic") or "23:00"
    sessiz_bit = kullanici.get("sessiz_bitis") or "07:00"
    try:
        simdi = datetime.now().strftime("%H:%M")
        if sessiz_bas > sessiz_bit:
            # Gece yarısını geçen aralık (ör. 23:00-07:00)
            if simdi >= sessiz_bas or simdi < sessiz_bit:
                log.info("    ⏸ Sessiz saatler içinde (%s-%s), bildirim atlanıyor", sessiz_bas, sessiz_bit)
                return False
        else:
            if sessiz_bas <= simdi < sessiz_bit:
                log.info("    ⏸ Sessiz saatler içinde (%s-%s), bildirim atlanıyor", sessiz_bas, sessiz_bit)
                return False
    except (ValueError, TypeError):
        pass

    return True


def cron_tarama():
    """Ana tarama döngüsü. İstatistikleri döndürür."""
    global istatistik
    istatistik = {"rota": 0, "fiyat_kaydedilen": 0, "firsat": 0}

    log.info("=" * 60)
    log.info("TARAMA BAŞLIYOR — %s", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    log.info("Havaalanları: %s | İndirim eşiği: %%%d", ", ".join(HAVAALANLARI), int((1 - INDIRIM_ESIGI) * 100))
    log.info("=" * 60)

    for idx, origin in enumerate(HAVAALANLARI):
        if idx > 0:
            time.sleep(API_BEKLEME)
        firsatlar = havaalani_tara(origin)
        for firsat in firsatlar:
            kullanicilar = firsat_icin_kullanicilar_bul(firsat)
            if not kullanicilar:
                continue
            itinerary = itinerary_olustur(firsat)
            firsat_itinerary_kaydet(firsat["id"], itinerary)
            for k in kullanicilar:
                if not _bildirim_gonderilebilir_mi(k, firsat):
                    continue
                indirim = firsat["indirim_orani"]
                sehir = firsat.get("varis_sehir", firsat["varis"])
                fiyat = f"{firsat['fiyat']:,}₺"
                bildirim_gonder(
                    k["fcm_token"],
                    f"{sehir} {fiyat}!",
                    f"%{indirim} ucuz! Komple program hazır.",
                    {"firsat_id": str(firsat["id"])}
                )
                bildirim_kaydet(k["id"], firsat["id"])

    # Uzak destinasyonlar — sadece büyük hub'lardan hedefli tarama
    log.info("=" * 60)
    log.info("UZAK ROTA TARAMASI — %d destinasyon, %d hub", len(UZAK_DESTINASYONLAR), len(UZAK_HUBLAR))
    log.info("=" * 60)
    for origin in UZAK_HUBLAR:
        for dest in UZAK_DESTINASYONLAR:
            time.sleep(1)  # Rate limit
            try:
                sonuc = hedef_ucuslar_getir(origin, dest, limit=3)
                for varis, veri in sonuc.items():
                    istatistik["rota"] += 1
                    fiyat = veri.get("price", 0)
                    if fiyat <= 0:
                        continue
                    normal = tarihsel_ortalama(origin, varis)
                    if not normal:
                        # Uzak rota, geçmiş veri yok — mevcut fiyatı %20 artırarak normal fiyat tahmin et
                        normal = int(fiyat * 1.2)
                    indirim = int((1 - fiyat / normal) * 100)
                    if indirim > 0:
                        f = _firsat_olustur_ve_kaydet(origin, varis, veri, fiyat, normal, max(indirim, 1))
                        if f:
                            firsatlar_list = [f]
                            for firsat in firsatlar_list:
                                kullanicilar = firsat_icin_kullanicilar_bul(firsat)
                                for k in kullanicilar:
                                    if not _bildirim_gonderilebilir_mi(k, firsat):
                                        continue
                                    sehir = firsat.get("varis_sehir", firsat["varis"])
                                    bildirim_gonder(
                                        k["fcm_token"],
                                        f"{sehir} {firsat['fiyat']:,}₺!",
                                        f"%{indirim} ucuz! Komple program hazır.",
                                        {"firsat_id": str(firsat["id"])}
                                    )
                                    bildirim_kaydet(k["id"], firsat["id"])
            except Exception as e:
                log.warning("    Uzak rota hatası [%s→%s]: %s", origin, dest, e)

    log.info("=" * 60)
    log.info("TARAMA TAMAMLANDI — %d rota tarandi, %d fiyat kaydedildi, %d firsat bulundu",
             istatistik["rota"], istatistik["fiyat_kaydedilen"], istatistik["firsat"])
    log.info("=" * 60)

    return istatistik


def havaalani_tara(origin: str) -> list:
    firsatlar = []
    log.info("--- [%s] Uçuşlar çekiliyor...", origin)
    guncel = ucuz_ucuslar_getir(origin)
    log.info("    [%s] API'den %d varış noktası döndü", origin, len(guncel))

    if not guncel:
        log.warning("    [%s] API boş döndü — token veya bağlantı kontrol edin", origin)
        return firsatlar

    # Tüm rotaları topla (indirim hesaplaması için)
    tum_rotalar = []

    for varis, veri in guncel.items():
        istatistik["rota"] += 1
        fiyat = veri.get("price", 0)
        if fiyat <= 0:
            log.debug("    [%s→%s] Fiyat 0 veya negatif, atlanıyor", origin, varis)
            continue

        normal = tarihsel_ortalama(origin, varis)
        kaynak = "db" if _son_ortalama_kaynak == "db" else "month-matrix"

        if not normal:
            log.info("    [%s→%s] Fiyat: %d₺ | Ortalama: YOK (veri yok) | Kaynak: -", origin, varis, fiyat)
            tum_rotalar.append({"varis": varis, "veri": veri, "fiyat": fiyat, "normal": None, "indirim": None})
            continue

        indirim = int((1 - fiyat / normal) * 100)
        log.info("    [%s→%s] Fiyat: %d₺ | Ortalama: %d₺ | İndirim: %%%d | Kaynak: %s",
                 origin, varis, fiyat, normal, indirim, kaynak)

        tum_rotalar.append({"varis": varis, "veri": veri, "fiyat": fiyat, "normal": normal, "indirim": indirim})

        # Uzak rotalar için daha düşük indirim eşiği
        esik = INDIRIM_ESIGI_UZAK if varis in set(UZAK_DESTINASYONLAR) else INDIRIM_ESIGI
        if fiyat < normal * esik:
            log.info("    ✓ [%s→%s] FIRSAT! %%%d indirim (eşik: %%%d)", origin, varis, indirim, int((1 - esik) * 100))
            f = _firsat_olustur_ve_kaydet(origin, varis, veri, fiyat, normal, indirim)
            if f:
                firsatlar.append(f)
        else:
            if indirim > 0:
                log.info("    ✗ [%s→%s] Eşik altı — %%%d < %%%d gerekli", origin, varis, indirim, int((1 - esik) * 100))
            else:
                log.info("    ✗ [%s→%s] İndirim yok (fiyat ortalama üstü)", origin, varis)

    # İlk tarama desteği: Hiç fırsat bulunamadıysa, en ucuz 10 uçuşu kaydet
    if not firsatlar:
        log.info("    [%s] Eşik üstü fırsat yok — en ucuz %d uçuş doğrudan kaydediliyor...", origin, ILK_TARAMA_EN_UCUZ)
        fiyatli_rotalar = [r for r in tum_rotalar if r["fiyat"] > 0]
        fiyatli_rotalar.sort(key=lambda x: x["fiyat"])

        for r in fiyatli_rotalar[:ILK_TARAMA_EN_UCUZ]:
            # Normal fiyat yoksa month-matrix'ten çek
            normal = r["normal"]
            if not normal:
                matris = aylik_matris_getir(origin, r["varis"])
                if matris:
                    fiyatlar = [d["price"] for d in matris if d.get("price")]
                    normal = int(sum(fiyatlar) / len(fiyatlar)) if fiyatlar else None
            if not normal:
                normal = int(r["fiyat"] * 1.3)  # Fallback: mevcut fiyatı %30 artır
                log.info("    [%s→%s] Month-matrix de boş, tahmini normal fiyat: %d₺", origin, r["varis"], normal)

            indirim = max(int((1 - r["fiyat"] / normal) * 100), 1)
            log.info("    → [%s→%s] En ucuz kayıt: %d₺ (ortalama: %d₺, %%%d)",
                     origin, r["varis"], r["fiyat"], normal, indirim)
            f = _firsat_olustur_ve_kaydet(origin, r["varis"], r["veri"], r["fiyat"], normal, indirim)
            if f:
                firsatlar.append(f)

    return firsatlar


# Ortalama kaynağını takip etmek için modül seviyesinde değişken
_son_ortalama_kaynak = ""


def tarihsel_ortalama(origin, varis):
    global _son_ortalama_kaynak
    try:
        conn = sqlite3.connect(DB)
        r = conn.execute("""
            SELECT AVG(fiyat) FROM firsatlar
            WHERE cikis=? AND varis=?
            AND olusturulma >= datetime('now','-90 days')
        """, (origin, varis)).fetchone()
    finally:
        conn.close()
    if r and r[0]:
        _son_ortalama_kaynak = "db"
        return int(r[0])
    matris = aylik_matris_getir(origin, varis)
    if matris:
        fiyatlar = [d["price"] for d in matris if d.get("price")]
        if fiyatlar:
            _son_ortalama_kaynak = "month-matrix"
            return int(sum(fiyatlar) / len(fiyatlar))
    _son_ortalama_kaynak = ""
    return None


def _sure_kontrol(ucus_tarihi, donus_tarihi, varis):
    """Süre limitini kontrol eder. (gecerli, gece_sayisi) döndürür."""
    if not ucus_tarihi or not donus_tarihi:
        return True, None
    try:
        g = datetime.strptime(ucus_tarihi, "%Y-%m-%d")
        d = datetime.strptime(donus_tarihi, "%Y-%m-%d")
        gece = (d - g).days
        if gece < 1:
            return False, gece
        limit = maks_gece(varis)
        if gece > limit:
            return False, gece
        return True, gece
    except ValueError:
        return True, None


def _firsat_olustur_ve_kaydet(origin, varis, veri, fiyat, normal, indirim):
    """Fırsat verisi oluşturup kaydeder, alternatif tarihleri de ekler."""
    ucus_tarihi = veri.get("departure_at", "")[:10]
    donus_tarihi = veri.get("return_at", "")[:10]

    # Geçmiş tarihli uçuşları kaydetme
    if ucus_tarihi:
        try:
            if datetime.strptime(ucus_tarihi, "%Y-%m-%d").date() < datetime.now().date():
                log.debug("    ✗ [%s→%s] Geçmiş tarih (%s), atlanıyor", origin, varis, ucus_tarihi)
                return None
        except ValueError:
            pass

    # Dönüş tarihi yoksa veya gidişle aynı günse, varsayılan süre ekle
    donus_eksik = not donus_tarihi or donus_tarihi == ucus_tarihi
    if donus_eksik and ucus_tarihi:
        try:
            gidis = datetime.strptime(ucus_tarihi, "%Y-%m-%d")
            varsayilan_gun = varsayilan_gece(varis)
            donus_tarihi = (gidis + timedelta(days=varsayilan_gun)).strftime("%Y-%m-%d")
        except ValueError:
            donus_tarihi = ""

    # Süre kontrolü
    gecerli, gece = _sure_kontrol(ucus_tarihi, donus_tarihi, varis)
    if not gecerli:
        bolge = bolge_bul(varis)
        limit = maks_gece(varis)
        log.info("    ✗ [%s→%s] Süre limiti aşıldı: %d gece > %d maks (%s), atlanıyor",
                 origin, varis, gece, limit, bolge)
        return None

    varis_sehir = sehir_adi_getir(varis)

    # Bilinmeyen IATA kodu kontrolü — mapping'de yoksa API'den dene, o da yoksa atla
    if varis_sehir == varis:
        api_isim = _travelpayouts_sehir_adi(varis)
        if api_isim:
            varis_sehir = api_isim
            log.info("    ℹ [%s] Mapping'de yok, API'den bulundu: %s", varis, api_isim)
        else:
            log.warning("    ✗ Bilinmeyen IATA: %s (mapping ve API'de yok), atlanıyor", varis)
            return None

    f = firsat_kaydet({
        "cikis": origin, "varis": varis, "varis_sehir": varis_sehir,
        "fiyat": fiyat, "normal_fiyat": normal,
        "indirim_orani": indirim,
        "ucus_tarihi": ucus_tarihi,
        "donus_tarihi": donus_tarihi,
        "havayolu": veri.get("airline", ""),
        "gecerlilik": veri.get("expires_at", ""),
        "aktarma": veri.get("aktarma", 0),
        "sure_dk": veri.get("sure_dk", 0),
    })

    if f:
        istatistik["firsat"] += 1
        # Alternatif tarihleri de kaydet
        alternatifler = alternatif_tarihler_getir(origin, varis)
        for alt in alternatifler:
            if alt["ucus_tarihi"] == ucus_tarihi:
                continue
            alt_donus = alt.get("donus_tarihi", "")
            if not alt_donus and alt["ucus_tarihi"]:
                try:
                    g = datetime.strptime(alt["ucus_tarihi"], "%Y-%m-%d")
                    alt_donus = (g + timedelta(days=4)).strftime("%Y-%m-%d")
                except ValueError:
                    alt_donus = ""
            alt_indirim = int((1 - alt["fiyat"] / normal) * 100) if normal else 0
            if alt_indirim > 0:
                alt_gecerli, _ = _sure_kontrol(alt["ucus_tarihi"], alt_donus, varis)
                if not alt_gecerli:
                    continue
                firsat_kaydet({
                    "cikis": origin, "varis": varis, "varis_sehir": varis_sehir,
                    "fiyat": alt["fiyat"], "normal_fiyat": normal,
                    "indirim_orani": alt_indirim,
                    "ucus_tarihi": alt["ucus_tarihi"],
                    "donus_tarihi": alt_donus,
                    "havayolu": veri.get("airline", ""),
                    "gecerlilik": veri.get("expires_at", "")
                })
        return f
    return None


def firsat_kaydet(f: dict) -> dict | None:
    conn = sqlite3.connect(DB)
    try:
        # Atomik UPSERT: INSERT OR IGNORE + UPDATE
        conn.execute("""
            INSERT OR IGNORE INTO firsatlar
            (cikis,varis,varis_sehir,fiyat,normal_fiyat,indirim_orani,
             ucus_tarihi,donus_tarihi,havayolu,gecerlilik,aktarma,sure_dk)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (f["cikis"], f["varis"], f.get("varis_sehir"), f["fiyat"],
              f["normal_fiyat"], f["indirim_orani"], f["ucus_tarihi"],
              f["donus_tarihi"], f["havayolu"], f["gecerlilik"],
              f.get("aktarma", 0), f.get("sure_dk", 0)))
        # Mevcut kayıt varsa güncelle
        conn.execute("""
            UPDATE firsatlar
            SET fiyat=?, normal_fiyat=?, indirim_orani=?, havayolu=?,
                gecerlilik=?, aktarma=?, sure_dk=?, aktif=1
            WHERE cikis=? AND varis=? AND ucus_tarihi=? AND donus_tarihi=?
        """, (f["fiyat"], f["normal_fiyat"], f["indirim_orani"],
              f["havayolu"], f["gecerlilik"],
              f.get("aktarma", 0), f.get("sure_dk", 0),
              f["cikis"], f["varis"], f["ucus_tarihi"], f["donus_tarihi"]))
        conn.commit()
        # ID'yi al
        row = conn.execute("""
            SELECT id FROM firsatlar
            WHERE cikis=? AND varis=? AND ucus_tarihi=? AND donus_tarihi=?
        """, (f["cikis"], f["varis"], f["ucus_tarihi"], f["donus_tarihi"])).fetchone()
        f["id"] = row[0] if row else None
        istatistik["fiyat_kaydedilen"] += 1
        log.debug("    DB: Fırsat #%s kaydedildi/güncellendi (%s→%s, %d₺)", f.get("id"), f["cikis"], f["varis"], f["fiyat"])
        return f if f.get("id") else None
    except Exception as e:
        log.error("    DB HATA: %s", e)
        return None
    finally:
        conn.close()


def firsat_itinerary_kaydet(firsat_id, itinerary):
    import json
    conn = sqlite3.connect(DB)
    try:
        mevcut = conn.execute(
            "SELECT id FROM paketler WHERE firsat_id=? AND kullanici_id IS NULL",
            (firsat_id,)
        ).fetchone()
        icerik = json.dumps(itinerary, ensure_ascii=False)
        if mevcut:
            conn.execute("UPDATE paketler SET icerik=? WHERE id=?", (icerik, mevcut[0]))
        else:
            conn.execute(
                "INSERT INTO paketler (firsat_id, icerik) VALUES (?,?)",
                (firsat_id, icerik)
            )
        conn.commit()
    finally:
        conn.close()


def bildirim_kaydet(kullanici_id, firsat_id):
    conn = sqlite3.connect(DB)
    try:
        conn.execute("""
            INSERT OR IGNORE INTO bildirimler (kullanici_id, firsat_id)
            VALUES (?,?)
        """, (kullanici_id, firsat_id))
        conn.commit()
    finally:
        conn.close()
