import sqlite3
import os
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
from services.travelpayouts import ucuz_ucuslar_getir, aylik_matris_getir, alternatif_tarihler_getir
from services.eslestirici import firsat_icin_kullanicilar_bul
from services.firebase_service import bildirim_gonder
from agents.itinerary_uretici import itinerary_olustur
from services.bolge import bolge_bul, maks_gece
from services.koordinat import sehir_adi_getir

load_dotenv()
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
INDIRIM_ESIGI = 0.80  # %20 indirim eşiği (fiyat < normal * 0.80)
ILK_TARAMA_EN_UCUZ = 10  # Geçmiş veri yoksa en ucuz N uçuşu kaydet
HAVAALANLARI = ["IST", "SAW", "ADB", "AYT", "ESB"]

log = logging.getLogger("ucus_tarayici")

# Tarama istatistikleri
istatistik = {"rota": 0, "fiyat_kaydedilen": 0, "firsat": 0}


def cron_tarama():
    """Ana tarama döngüsü. İstatistikleri döndürür."""
    global istatistik
    istatistik = {"rota": 0, "fiyat_kaydedilen": 0, "firsat": 0}

    log.info("=" * 60)
    log.info("TARAMA BAŞLIYOR — %s", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    log.info("Havaalanları: %s | İndirim eşiği: %%%d", ", ".join(HAVAALANLARI), int((1 - INDIRIM_ESIGI) * 100))
    log.info("=" * 60)

    for origin in HAVAALANLARI:
        firsatlar = havaalani_tara(origin)
        for firsat in firsatlar:
            kullanicilar = firsat_icin_kullanicilar_bul(firsat)
            if not kullanicilar:
                continue
            itinerary = itinerary_olustur(firsat)
            firsat_itinerary_kaydet(firsat["id"], itinerary)
            for k in kullanicilar:
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

        if fiyat < normal * INDIRIM_ESIGI:
            log.info("    ✓ [%s→%s] FIRSAT! %%%d indirim (eşik: %%%d)", origin, varis, indirim, int((1 - INDIRIM_ESIGI) * 100))
            f = _firsat_olustur_ve_kaydet(origin, varis, veri, fiyat, normal, indirim)
            if f:
                firsatlar.append(f)
        else:
            if indirim > 0:
                log.info("    ✗ [%s→%s] Eşik altı — %%%d < %%%d gerekli", origin, varis, indirim, int((1 - INDIRIM_ESIGI) * 100))
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
    conn = sqlite3.connect(DB)
    r = conn.execute("""
        SELECT AVG(fiyat) FROM firsatlar
        WHERE cikis=? AND varis=?
        AND olusturulma >= datetime('now','-90 days')
    """, (origin, varis)).fetchone()
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
    if not donus_tarihi and ucus_tarihi:
        try:
            gidis = datetime.strptime(ucus_tarihi, "%Y-%m-%d")
            donus_tarihi = (gidis + timedelta(days=4)).strftime("%Y-%m-%d")
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

    f = firsat_kaydet({
        "cikis": origin, "varis": varis, "varis_sehir": varis_sehir,
        "fiyat": fiyat, "normal_fiyat": normal,
        "indirim_orani": indirim,
        "ucus_tarihi": ucus_tarihi,
        "donus_tarihi": donus_tarihi,
        "havayolu": veri.get("airline", ""),
        "gecerlilik": veri.get("expires_at", "")
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
        cur = conn.execute("""
            INSERT INTO firsatlar
            (cikis,varis,varis_sehir,fiyat,normal_fiyat,indirim_orani,
             ucus_tarihi,donus_tarihi,havayolu,gecerlilik)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (f["cikis"], f["varis"], f.get("varis_sehir"), f["fiyat"],
              f["normal_fiyat"], f["indirim_orani"], f["ucus_tarihi"],
              f["donus_tarihi"], f["havayolu"], f["gecerlilik"]))
        f["id"] = cur.lastrowid
        conn.commit()
        istatistik["fiyat_kaydedilen"] += 1
        log.debug("    DB: Fırsat #%d kaydedildi (%s→%s, %d₺)", f["id"], f["cikis"], f["varis"], f["fiyat"])
        return f if f["id"] else None
    except Exception as e:
        log.error("    DB HATA: %s", e)
        return None
    finally:
        conn.close()


def firsat_itinerary_kaydet(firsat_id, itinerary):
    import json
    conn = sqlite3.connect(DB)
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
    conn.close()


def bildirim_kaydet(kullanici_id, firsat_id):
    conn = sqlite3.connect(DB)
    conn.execute("""
        INSERT OR IGNORE INTO bildirimler (kullanici_id, firsat_id)
        VALUES (?,?)
    """, (kullanici_id, firsat_id))
    conn.commit()
    conn.close()
