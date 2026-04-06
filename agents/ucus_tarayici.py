import sqlite3
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from services.travelpayouts import ucuz_ucuslar_getir, aylik_matris_getir, alternatif_tarihler_getir
from services.eslestirici import firsat_icin_kullanicilar_bul
from services.firebase_service import bildirim_gonder
from agents.itinerary_uretici import itinerary_olustur

load_dotenv()
DB = os.getenv("DATABASE_PATH", "data/kacamak.db")
INDIRIM_ESIGI = 0.65
HAVAALANLARI = ["IST", "SAW", "ADB", "AYT", "ESB"]

def cron_tarama():
    print(f"[{datetime.now()}] Tarama başlıyor...")
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
    print(f"[{datetime.now()}] Tarama tamamlandı.")

def havaalani_tara(origin: str) -> list:
    firsatlar = []
    guncel = ucuz_ucuslar_getir(origin)
    for varis, veri in guncel.items():
        fiyat = veri.get("price", 0)
        normal = tarihsel_ortalama(origin, varis)
        if not normal or fiyat <= 0:
            continue
        indirim = int((1 - fiyat / normal) * 100)
        if fiyat < normal * INDIRIM_ESIGI:
            ucus_tarihi = veri.get("departure_at", "")[:10]
            donus_tarihi = veri.get("return_at", "")[:10]
            # Dönüş tarihi yoksa gidiş + 4 gün olarak hesapla
            if not donus_tarihi and ucus_tarihi:
                try:
                    gidis = datetime.strptime(ucus_tarihi, "%Y-%m-%d")
                    donus_tarihi = (gidis + timedelta(days=4)).strftime("%Y-%m-%d")
                except ValueError:
                    donus_tarihi = ""
            f = firsat_kaydet({
                "cikis": origin, "varis": varis,
                "fiyat": fiyat, "normal_fiyat": normal,
                "indirim_orani": indirim,
                "ucus_tarihi": ucus_tarihi,
                "donus_tarihi": donus_tarihi,
                "havayolu": veri.get("airline", ""),
                "gecerlilik": veri.get("expires_at", "")
            })
            if f:
                # Aynı rotanın alternatif tarihlerini de kaydet
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
                        firsat_kaydet({
                            "cikis": origin, "varis": varis,
                            "fiyat": alt["fiyat"], "normal_fiyat": normal,
                            "indirim_orani": alt_indirim,
                            "ucus_tarihi": alt["ucus_tarihi"],
                            "donus_tarihi": alt_donus,
                            "havayolu": veri.get("airline", ""),
                            "gecerlilik": veri.get("expires_at", "")
                        })
                firsatlar.append(f)
    return firsatlar

def tarihsel_ortalama(origin, varis):
    conn = sqlite3.connect(DB)
    r = conn.execute("""
        SELECT AVG(fiyat) FROM firsatlar
        WHERE cikis=? AND varis=?
        AND olusturulma >= datetime('now','-90 days')
    """, (origin, varis)).fetchone()
    conn.close()
    if r and r[0]:
        return int(r[0])
    matris = aylik_matris_getir(origin, varis)
    if matris:
        fiyatlar = [d["price"] for d in matris if d.get("price")]
        return int(sum(fiyatlar)/len(fiyatlar)) if fiyatlar else None
    return None

def firsat_kaydet(f: dict) -> dict | None:
    conn = sqlite3.connect(DB)
    try:
        cur = conn.execute("""
            INSERT OR IGNORE INTO firsatlar
            (cikis,varis,fiyat,normal_fiyat,indirim_orani,
             ucus_tarihi,donus_tarihi,havayolu,gecerlilik)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (f["cikis"],f["varis"],f["fiyat"],f["normal_fiyat"],
              f["indirim_orani"],f["ucus_tarihi"],f["donus_tarihi"],
              f["havayolu"],f["gecerlilik"]))
        f["id"] = cur.lastrowid
        conn.commit()
        return f if f["id"] else None
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
