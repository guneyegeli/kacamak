import sqlite3
import json
import os

DB = os.getenv("DATABASE_PATH", "data/kacamak.db")

def firsat_icin_kullanicilar_bul(firsat: dict) -> list:
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT DISTINCT k.id, k.ad, k.fcm_token,
               t.maks_butce, t.tercih_tipleri, t.yetiskin_sayisi,
               t.cocuk_var, t.direkt_ucus, t.otel_yildiz,
               t.min_gece, t.max_gece
        FROM kullanicilar k
        JOIN tercihler t ON t.kullanici_id = k.id
        WHERE k.aktif = 1
          AND t.aktif = 1
          AND t.cikis_havaalani = ?
          AND t.maks_butce >= ?
          AND t.min_indirim_orani <= ?
          AND k.fcm_token IS NOT NULL
          AND k.id NOT IN (
              SELECT kullanici_id FROM bildirimler WHERE firsat_id = ?
          )
    """, (firsat["cikis"], firsat["fiyat"],
          firsat["indirim_orani"], firsat["id"])).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def tercih_profili_olustur(kullanici_id: int, data: dict):
    conn = sqlite3.connect(DB)
    conn.execute("UPDATE tercihler SET aktif=0 WHERE kullanici_id=?", (kullanici_id,))
    for havaalani in data["cikis_havalimanlari"]:
        conn.execute("""
            INSERT INTO tercihler (
                kullanici_id, cikis_havaalani, maks_butce,
                min_indirim_orani, yetiskin_sayisi, cocuk_var,
                esnek_tarih, direkt_ucus, otel_yildiz,
                otel_yildizlar, otel_butce, otel_konum, kahvalti_dahil,
                min_gece, max_gece, tercih_tipleri
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
            json.dumps(data.get("tercih_tipleri", []))
        ))
    conn.commit()
    conn.close()
