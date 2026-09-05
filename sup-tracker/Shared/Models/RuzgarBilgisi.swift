import Foundation
import CoreLocation

/// Belirli bir an ve konum için gözlenen/tahmin edilen rüzgar.
struct RuzgarBilgisi: Codable, Equatable {
    var hizMS: Double            // metre/saniye
    var yonDerece: Double        // 0-360, meteorolojik: rüzgarın GELDİĞİ yön
    var gustMS: Double?          // hamle (gust) hızı, metre/saniye; kaynak vermezse nil
    var sicaklikC: Double?       // opsiyonel hava sıcaklığı
    var zaman: Date              // verinin geçerli olduğu an
    var alinmaZamani: Date       // cihazın veriyi çektiği an (eskilik kontrolü için)
    var kaynak: RuzgarKaynagi

    init(hizMS: Double, yonDerece: Double, gustMS: Double?, sicaklikC: Double? = nil,
         zaman: Date, alinmaZamani: Date = Date(), kaynak: RuzgarKaynagi) {
        self.hizMS = hizMS
        self.yonDerece = yonDerece
        self.gustMS = gustMS
        self.sicaklikC = sicaklikC
        self.zaman = zaman
        self.alinmaZamani = alinmaZamani
        self.kaynak = kaynak
    }

    // MARK: - Türetilmiş görüntü değerleri

    /// Metre/saniyeden knot'a (deniz mili/saat) çevrim.
    var hizKnot: Double { hizMS * 1.943844 }

    /// Metre/saniyeden km/s'e çevrim.
    var hizKmS: Double { hizMS * 3.6 }

    var gustKnot: Double? {
        guard let gustMS else { return nil }
        return gustMS * 1.943844
    }

    /// Pusula kısaltması ("K","KD","D","GD","G","GB","B","KB") — rüzgarın GELDİĞİ yön.
    var yonKisaltma: String { Self.pusulaKisaltmasi(yonDerece) }

    /// Okun gösterdiği akış (hareket) yönü — rüzgarın GİTTİĞİ yön (kaynak yönünün tam tersi).
    var yonOkuDerece: Double {
        (yonDerece + 180).truncatingRemainder(dividingBy: 360)
    }

    /// Beaufort ölçeği (0-12), hız (m/s) tabanlı.
    var beaufort: Int {
        Self.beaufort(hizMS: hizMS)
    }

    /// Veri 45 dakikadan eskiyse true.
    var eskiMi: Bool {
        Date().timeIntervalSince(alinmaZamani) > 45 * 60
    }

    /// Spor türüne göre güvenlik bandı (gust yoksa hız üzerinden değerlendirilir).
    /// Eşikler STRATEGY.md §2.4: SUP/kano/kürek için gust ≥10.8 m/s kırmızı, 8.0-10.7 sarı, altı yeşil.
    /// Yelken/kite/sörf gibi rüzgara daha bağımlı/toleranslı sporlar için eşikler ~2 m/s daha yüksek tutulur.
    func guvenlikBandi(sporTuru: SporTuru) -> RuzgarGuvenlikBandi {
        let degerlendirilenHiz = gustMS ?? hizMS
        let (sariEsigi, kirmiziEsigi) = Self.esikler(sporTuru: sporTuru)
        if degerlendirilenHiz >= kirmiziEsigi {
            return .tehlikeli
        } else if degerlendirilenHiz >= sariEsigi {
            return .dikkat
        }
        return .sakin
    }

    // MARK: - Yardımcılar

    private static func esikler(sporTuru: SporTuru) -> (sari: Double, kirmizi: Double) {
        switch sporTuru {
        case .sup, .kano, .kurek, .acikSuYuzme:
            // STRATEGY.md §2.4'teki temel eşikler.
            return (8.0, 10.8)
        case .yelken, .kiteSorf, .surf:
            // Rüzgara doğası gereği bağımlı/toleranslı sporlar: eşikler ~2 m/s yukarı kaydırılır.
            return (10.0, 12.8)
        }
    }

    private static func pusulaKisaltmasi(_ derece: Double) -> String {
        let yonler = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"]
        let normalize = derece.truncatingRemainder(dividingBy: 360)
        let pozitif = normalize < 0 ? normalize + 360 : normalize
        let index = Int((pozitif / 45.0).rounded()) % 8
        return yonler[index]
    }

    private static func beaufort(hizMS: Double) -> Int {
        switch hizMS {
        case ..<0.3: return 0
        case 0.3..<1.6: return 1
        case 1.6..<3.4: return 2
        case 3.4..<5.5: return 3
        case 5.5..<8.0: return 4
        case 8.0..<10.8: return 5
        case 10.8..<13.9: return 6
        case 13.9..<17.2: return 7
        case 17.2..<20.8: return 8
        case 20.8..<24.5: return 9
        case 24.5..<28.5: return 10
        case 28.5..<32.7: return 11
        default: return 12
        }
    }
}

enum RuzgarKaynagi: String, Codable {
    case openMeteo = "open_meteo"
    case weatherKit = "weather_kit"
    case onbellek = "onbellek"
    case manuel = "manuel"
}

enum RuzgarGuvenlikBandi: String, Codable {
    case sakin      // yeşil
    case dikkat     // sarı
    case tehlikeli  // kırmızı
}
