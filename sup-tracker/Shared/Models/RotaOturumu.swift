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
    var aktifKaloriKcal: Double?
    var stravaAktiviteId: String?
    var healthKitID: UUID?
    var kaydedenCihaz: String   // "iPhone" | "Apple Watch"
    var notlar: String?

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
}
