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

CREATE INDEX IF NOT EXISTS idx_tercihler_kullanici ON tercihler(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_tercihler_havaalani ON tercihler(cikis_havaalani);
CREATE INDEX IF NOT EXISTS idx_firsatlar_cikis ON firsatlar(cikis);
CREATE INDEX IF NOT EXISTS idx_firsatlar_tarih ON firsatlar(olusturulma);
CREATE INDEX IF NOT EXISTS idx_bildirimler_kullanici ON bildirimler(kullanici_id);
