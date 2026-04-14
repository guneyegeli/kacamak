import sqlite3
import json
import os

DB = os.getenv("DATABASE_PATH", "data/kacamak.db")

def firsat_icin_kullanicilar_bul(firsat: dict) -> list:
    from datetime import datetime, timedelta

    conn = sqlite3.connect(DB)
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT DISTINCT k.id, k.ad, k.fcm_token,
                   t.maks_butce, t.tercih_tipleri, t.yetiskin_sayisi,
                   t.cocuk_var, t.direkt_ucus, t.otel_yildiz,
                   t.min_gece, t.max_gece,
                   t.bildirim_aktif, t.min_indirim_esigi,
                   t.bildirim_sikligi, t.yurtici_bildirim,
                   t.yurtdisi_bildirim, t.sessiz_baslangic, t.sessiz_bitis,
                   t.esnek_tarih, t.gidis_tarihi, t.donus_tarihi
            FROM kullanicilar k
            JOIN tercihler t ON t.kullanici_id = k.id
            WHERE k.aktif = 1
              AND t.aktif = 1
              AND t.cikis_havaalani = ?
              AND t.maks_butce >= ?
              AND t.min_indirim_orani <= ?
              AND k.fcm_token IS NOT NULL
              AND (t.bildirim_aktif = 1 OR t.bildirim_aktif IS NULL)
              AND k.id NOT IN (
                  SELECT kullanici_id FROM bildirimler WHERE firsat_id = ?
              )
        """, (firsat["cikis"], firsat["fiyat"],
              firsat["indirim_orani"], firsat["id"])).fetchall()

        sonuc = []
        ucus_tarihi = firsat.get("ucus_tarihi", "")
        for r in rows:
            rd = dict(r)
            # Kesin tarih seçilmişse ±1 gün toleransla filtrele
            if not rd.get("esnek_tarih") and rd.get("gidis_tarihi") and ucus_tarihi:
                try:
                    kullanici_gidis = datetime.strptime(rd["gidis_tarihi"], "%Y-%m-%d")
                    firsat_gidis = datetime.strptime(ucus_tarihi, "%Y-%m-%d")
                    if abs((firsat_gidis - kullanici_gidis).days) > 1:
                        continue
                except (ValueError, TypeError):
                    pass
            sonuc.append(rd)
        return sonuc
    finally:
        conn.close()

def tercih_profili_olustur(kullanici_id: int, data: dict):
    conn = sqlite3.connect(DB)
    try:
        conn.execute("UPDATE tercihler SET aktif=0 WHERE kullanici_id=?", (kullanici_id,))
        for havaalani in data["cikis_havalimanlari"]:
            conn.execute("""
                INSERT INTO tercihler (
                    kullanici_id, cikis_havaalani, maks_butce,
                    min_indirim_orani, yetiskin_sayisi, cocuk_var,
                    esnek_tarih, direkt_ucus, otel_yildiz,
                    otel_yildizlar, otel_butce, otel_konum, kahvalti_dahil,
                    min_gece, max_gece, tercih_tipleri,
                    bildirim_aktif, min_indirim_esigi, bildirim_sikligi,
                    yurtici_bildirim, yurtdisi_bildirim,
                    sessiz_baslangic, sessiz_bitis,
                    gidis_tarihi, donus_tarihi
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                kullanici_id, havaalani,
                data.get("maks_butce", 10000),
                data.get("min_indirim_orani", 30),
                data.get("yetiskin_sayisi", 1),
                int(data.get("cocuk_var", False)),
                int(data.get("esnek_tarih", True)),
                int(data.get("direkt_ucus", False)),
                data.get("otel_yildiz", 3),
                json.dumps(data.get("otel_yildizlar", [3, 4])),
                data.get("otel_butce", 2000),
                data.get("otel_konum", "farketmez"),
                int(data.get("kahvalti_dahil", False)),
                data.get("min_gece", 2),
                data.get("max_gece", 7),
                json.dumps(data.get("tercih_tipleri", [])),
                int(data.get("bildirim_aktif", True)),
                data.get("min_indirim_esigi", 30),
                data.get("bildirim_sikligi", "anlik"),
                int(data.get("yurtici_bildirim", True)),
                int(data.get("yurtdisi_bildirim", True)),
                data.get("sessiz_baslangic", "23:00"),
                data.get("sessiz_bitis", "07:00"),
                data.get("gidis_tarihi"),
                data.get("donus_tarihi"),
            ))
        conn.commit()
    finally:
        conn.close()
