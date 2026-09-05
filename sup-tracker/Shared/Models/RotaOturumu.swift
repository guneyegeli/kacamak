import Foundation

/// Tek bir su sporu antrenman oturumu: kaydedilen rota + hesaplanan istatistikler.
struct RotaOturumu: Codable, Identifiable {
    let id: UUID
    var sporTuru: SporTuru
    var baslangicZamani: Date
    var bitisZamani: Date?
    var noktalar: [GPSNoktasi]
    var toplamMesafeMetre: Double
    var ortalamaHizMS: Double
    var maksimumHizMS: Double
    var ortalamaKalpAtisi: Double?
    var maksimumKalpAtisi: Double?
    var aktifKaloriKcal: Double?
    var stravaAktiviteId: String?
    var healthKitID: UUID?
    var kaydedenCihaz: String   // "iPhone" | "Apple Watch"
    var notlar: String?

    // Kürek çekme performansı (kürek sayımı desteklenmeyen sporlarda 0 / nil kalır).
    var kurekSayisi: Int
    var ortalamaKurekHizi: Double?          // kürek/dk
    var maksimumKurekHizi: Double?
    var kurekBasinaMesafeMetre: Double?
    var ortalamaGucEndeksi: Double?

    // Koşullar (rüzgar).
    var baslangicRuzgari: RuzgarBilgisi?
    var bitisRuzgari: RuzgarBilgisi?
    var maksimumGustMS: Double?

    init(sporTuru: SporTuru, kaydedenCihaz: String) {
        self.id = UUID()
        self.sporTuru = sporTuru
        self.baslangicZamani = Date()
        self.bitisZamani = nil
        self.noktalar = []
        self.toplamMesafeMetre = 0
        self.ortalamaHizMS = 0
        self.maksimumHizMS = 0
        self.kaydedenCihaz = kaydedenCihaz
        self.kurekSayisi = 0
    }

    var sureSaniye: TimeInterval {
        (bitisZamani ?? Date()).timeIntervalSince(baslangicZamani)
    }

    var tamamlandiMi: Bool { bitisZamani != nil }

    /// dakika/km cinsinden tempo (SUP ve kürek sporlarında yaygın gösterim).
    var tempoDakikaKm: Double? {
        guard toplamMesafeMetre > 0, ortalamaHizMS > 0 else { return nil }
        let saniyeKm = 1000 / ortalamaHizMS
        return saniyeKm / 60
    }

    /// "KD 13 kn, gust 22" gibi kısa bir koşul özeti (en güncel rüzgar bilgisine göre).
    var ruzgarOzeti: String? {
        guard let ruzgar = bitisRuzgari ?? baslangicRuzgari else { return nil }
        var metin = "\(ruzgar.yonKisaltma) \(Int(ruzgar.hizKnot.rounded())) kn"
        if let gust = ruzgar.gustKnot {
            metin += ", gust \(Int(gust.rounded()))"
        }
        return metin
    }

    /// Kürek başına kat edilen mesafe (verimlilik göstergesi).
    var kurekVerimlilikMetreBasi: Double? {
        guard kurekSayisi > 0 else { return nil }
        return toplamMesafeMetre / Double(kurekSayisi)
    }

    mutating func noktaEkle(_ nokta: GPSNoktasi) {
        if let sonNokta = noktalar.last {
            let mesafe = sonNokta.clLocation.distance(from: nokta.clLocation)
            // GPS gürültüsünü / duraksama sıçramalarını filtrele.
            if mesafe > 0.5 && mesafe < 200 {
                toplamMesafeMetre += mesafe
            }
        }
        noktalar.append(nokta)
        maksimumHizMS = max(maksimumHizMS, nokta.hizMS)
        let gecerliHizlar = noktalar.map(\.hizMS).filter { $0 > 0 }
        if !gecerliHizlar.isEmpty {
            ortalamaHizMS = gecerliHizlar.reduce(0, +) / Double(gecerliHizlar.count)
        }
    }

    mutating func bitir() {
        bitisZamani = Date()
    }

    /// KurekSayaci.ozet çıktısını oturuma uygular (oturum bitişinde çağrılır).
    mutating func kurekOzetiUygula(_ ozet: KurekOzeti) {
        kurekSayisi = ozet.kurekSayisi
        ortalamaKurekHizi = ozet.ortalamaKurekHizi
        maksimumKurekHizi = ozet.maksimumKurekHizi
        kurekBasinaMesafeMetre = ozet.kurekBasinaMesafeMetre
        ortalamaGucEndeksi = ozet.ortalamaGucEndeksi
    }

    /// Yeni bir rüzgar okuması geldiğinde çağrılır; en güncel değeri "bitiş" olarak,
    /// oturum boyunca görülen en yüksek gust'ı ayrıca tutar.
    mutating func ruzgarGuncelle(_ bilgi: RuzgarBilgisi) {
        if baslangicRuzgari == nil {
            baslangicRuzgari = bilgi
        }
        bitisRuzgari = bilgi
        if let gust = bilgi.gustMS {
            maksimumGustMS = max(maksimumGustMS ?? 0, gust)
        }
    }

    // MARK: - Geriye dönük uyumlu Codable

    // NOT: Bu tip yeni alanlarla (kürek/rüzgar) genişletildi. Cihazda daha önce
    // `oturumlar.json`'a yazılmış kayıtlarda bu alanlar bulunmuyor; `decodeIfPresent`
    // ile eksik alanlar sessizce varsayılan değere düşürülür, aksi halde eski geçmiş
    // tamamen okunamaz hale gelirdi. `encode(to:)` derleyici tarafından otomatik
    // üretilir (CodingKeys tüm depolanan alanları kapsadığı için).
    enum CodingKeys: String, CodingKey {
        case id, sporTuru, baslangicZamani, bitisZamani, noktalar
        case toplamMesafeMetre, ortalamaHizMS, maksimumHizMS
        case ortalamaKalpAtisi, maksimumKalpAtisi, aktifKaloriKcal
        case stravaAktiviteId, healthKitID, kaydedenCihaz, notlar
        case kurekSayisi, ortalamaKurekHizi, maksimumKurekHizi
        case kurekBasinaMesafeMetre, ortalamaGucEndeksi
        case baslangicRuzgari, bitisRuzgari, maksimumGustMS
    }

    init(from decoder: Decoder) throws {
        let kutu = try decoder.container(keyedBy: CodingKeys.self)
        id = try kutu.decode(UUID.self, forKey: .id)
        sporTuru = try kutu.decode(SporTuru.self, forKey: .sporTuru)
        baslangicZamani = try kutu.decode(Date.self, forKey: .baslangicZamani)
        bitisZamani = try kutu.decodeIfPresent(Date.self, forKey: .bitisZamani)
        noktalar = try kutu.decodeIfPresent([GPSNoktasi].self, forKey: .noktalar) ?? []
        toplamMesafeMetre = try kutu.decodeIfPresent(Double.self, forKey: .toplamMesafeMetre) ?? 0
        ortalamaHizMS = try kutu.decodeIfPresent(Double.self, forKey: .ortalamaHizMS) ?? 0
        maksimumHizMS = try kutu.decodeIfPresent(Double.self, forKey: .maksimumHizMS) ?? 0
        ortalamaKalpAtisi = try kutu.decodeIfPresent(Double.self, forKey: .ortalamaKalpAtisi)
        maksimumKalpAtisi = try kutu.decodeIfPresent(Double.self, forKey: .maksimumKalpAtisi)
        aktifKaloriKcal = try kutu.decodeIfPresent(Double.self, forKey: .aktifKaloriKcal)
        stravaAktiviteId = try kutu.decodeIfPresent(String.self, forKey: .stravaAktiviteId)
        healthKitID = try kutu.decodeIfPresent(UUID.self, forKey: .healthKitID)
        kaydedenCihaz = try kutu.decodeIfPresent(String.self, forKey: .kaydedenCihaz) ?? "iPhone"
        notlar = try kutu.decodeIfPresent(String.self, forKey: .notlar)
        kurekSayisi = try kutu.decodeIfPresent(Int.self, forKey: .kurekSayisi) ?? 0
        ortalamaKurekHizi = try kutu.decodeIfPresent(Double.self, forKey: .ortalamaKurekHizi)
        maksimumKurekHizi = try kutu.decodeIfPresent(Double.self, forKey: .maksimumKurekHizi)
        kurekBasinaMesafeMetre = try kutu.decodeIfPresent(Double.self, forKey: .kurekBasinaMesafeMetre)
        ortalamaGucEndeksi = try kutu.decodeIfPresent(Double.self, forKey: .ortalamaGucEndeksi)
        baslangicRuzgari = try kutu.decodeIfPresent(RuzgarBilgisi.self, forKey: .baslangicRuzgari)
        bitisRuzgari = try kutu.decodeIfPresent(RuzgarBilgisi.self, forKey: .bitisRuzgari)
        maksimumGustMS = try kutu.decodeIfPresent(Double.self, forKey: .maksimumGustMS)
    }
}
