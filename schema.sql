CREATE TABLE IF NOT EXISTS kullanicilar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    ad TEXT,
    fcm_token TEXT,
    aktif INTEGER DEFAULT 1,
    olusturulma TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tercihler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER REFERENCES kullanicilar(id),
    cikis_havaalani TEXT NOT NULL,
    maks_butce INTEGER DEFAULT 10000,
    min_indirim_orani INTEGER DEFAULT 30,
    yetiskin_sayisi INTEGER DEFAULT 1,
    cocuk_var INTEGER DEFAULT 0,
    esnek_tarih INTEGER DEFAULT 1,
    direkt_ucus INTEGER DEFAULT 0,
    otel_yildiz INTEGER DEFAULT 3,
    otel_yildizlar TEXT DEFAULT '[3,4]',
    otel_butce INTEGER DEFAULT 2000,
    otel_konum TEXT DEFAULT 'farketmez',
    kahvalti_dahil INTEGER DEFAULT 0,
    min_gece INTEGER DEFAULT 2,
    max_gece INTEGER DEFAULT 7,
    tercih_tipleri TEXT DEFAULT '[]',
    aktif INTEGER DEFAULT 1,
    guncelleme TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paket_tercihleri (
    kullanici_id INTEGER PRIMARY KEY REFERENCES kullanicilar(id),
    ucus INTEGER DEFAULT 1,
    otel INTEGER DEFAULT 1,
    etkinlik INTEGER DEFAULT 1,
    restoran INTEGER DEFAULT 1,
    tur INTEGER DEFAULT 1,
    arac_kiralama INTEGER DEFAULT 0,
    sigorta INTEGER DEFAULT 0,
    guncelleme TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS firsatlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cikis TEXT NOT NULL,
    varis TEXT NOT NULL,
    varis_sehir TEXT,
    fiyat INTEGER NOT NULL,
    normal_fiyat INTEGER,
    indirim_orani INTEGER,
    ucus_tarihi DATE,
    donus_tarihi DATE,
    havayolu TEXT,
    ucus_no TEXT,
    affiliate_link TEXT,
    gecerlilik TIMESTAMP,
    aktarma INTEGER DEFAULT 0,
    sure_dk INTEGER DEFAULT 0,
    aktif INTEGER DEFAULT 1,
    olusturulma TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paketler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firsat_id INTEGER REFERENCES firsatlar(id),
    kullanici_id INTEGER REFERENCES kullanicilar(id),
    icerik TEXT,
    butce_ozeti TEXT,
    olusturulma TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(firsat_id, kullanici_id)
);

CREATE TABLE IF NOT EXISTS bildirimler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER REFERENCES kullanicilar(id),
    firsat_id INTEGER REFERENCES firsatlar(id),
    gonderilme TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kullanici_id, firsat_id)
);

CREATE TABLE IF NOT EXISTS yenileme_kuyrugu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER REFERENCES kullanicilar(id),
    istek_zamani TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    islendi INTEGER DEFAULT 0
);

-- Otel bilgileri (v0.7)
ALTER TABLE firsatlar ADD COLUMN otel_min_fiyat INTEGER;
ALTER TABLE firsatlar ADD COLUMN otel_toplam INTEGER;
ALTER TABLE firsatlar ADD COLUMN otel_adi TEXT;
ALTER TABLE firsatlar ADD COLUMN otel_yildiz INTEGER;
ALTER TABLE firsatlar ADD COLUMN toplam_tahmini INTEGER;
ALTER TABLE firsatlar ADD COLUMN otel_id TEXT;

-- Tarih tercihleri (v0.6)
ALTER TABLE tercihler ADD COLUMN gidis_tarihi TEXT;
ALTER TABLE tercihler ADD COLUMN donus_tarihi TEXT;

-- Bildirim tercihleri (v0.5)
ALTER TABLE tercihler ADD COLUMN bildirim_aktif INTEGER DEFAULT 1;
ALTER TABLE tercihler ADD COLUMN min_indirim_esigi INTEGER DEFAULT 30;
ALTER TABLE tercihler ADD COLUMN bildirim_sikligi TEXT DEFAULT 'anlik';
ALTER TABLE tercihler ADD COLUMN yurtici_bildirim INTEGER DEFAULT 1;
ALTER TABLE tercihler ADD COLUMN yurtdisi_bildirim INTEGER DEFAULT 1;
ALTER TABLE tercihler ADD COLUMN sessiz_baslangic TEXT DEFAULT '23:00';
ALTER TABLE tercihler ADD COLUMN sessiz_bitis TEXT DEFAULT '07:00';

CREATE INDEX IF NOT EXISTS idx_tercihler_kullanici ON tercihler(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_tercihler_havaalani ON tercihler(cikis_havaalani);
CREATE INDEX IF NOT EXISTS idx_firsatlar_cikis ON firsatlar(cikis);
CREATE INDEX IF NOT EXISTS idx_firsatlar_varis ON firsatlar(varis);
CREATE INDEX IF NOT EXISTS idx_firsatlar_cikis_varis ON firsatlar(cikis, varis);
CREATE INDEX IF NOT EXISTS idx_firsatlar_tarih ON firsatlar(olusturulma);
CREATE INDEX IF NOT EXISTS idx_firsatlar_ucus_tarihi ON firsatlar(ucus_tarihi);
CREATE INDEX IF NOT EXISTS idx_firsatlar_aktif ON firsatlar(aktif);
CREATE INDEX IF NOT EXISTS idx_paketler_kullanici ON paketler(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_paketler_firsat ON paketler(firsat_id);
CREATE INDEX IF NOT EXISTS idx_bildirimler_kullanici ON bildirimler(kullanici_id);

-- Otel cache (v0.8) — real-time Hotellook arama sonuçları
CREATE TABLE IF NOT EXISTS otel_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sehir TEXT NOT NULL,
    checkin DATE NOT NULL,
    checkout DATE NOT NULL,
    yetiskin INTEGER DEFAULT 2,
    cocuk INTEGER DEFAULT 0,
    oteller TEXT,
    durum TEXT DEFAULT 'searching',
    search_id TEXT,
    olusturulma TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otel_cache_arama ON otel_cache(sehir, checkin, checkout);
