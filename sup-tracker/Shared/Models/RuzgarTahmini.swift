import Foundation
import CoreLocation

/// Saatlik tahmin dizisinin tek elemanı.
struct RuzgarTahmini: Codable, Identifiable, Equatable {
    var id: Date { zaman }
    var zaman: Date              // saat başı
    var hizMS: Double
    var yonDerece: Double
    var gustMS: Double?

    var hizKnot: Double { hizMS * 1.943844 }

    var gustKnot: Double? {
        guard let gustMS else { return nil }
        return gustMS * 1.943844
    }

    var yonKisaltma: String {
        ruzgarBilgisi.yonKisaltma
    }

    /// RuzgarBilgisi'ne dönüştürme (aynı türetilmiş hesaplar için — hız/yön/gust/beaufort/güvenlik bandı).
    var ruzgarBilgisi: RuzgarBilgisi {
        RuzgarBilgisi(
            hizMS: hizMS,
            yonDerece: yonDerece,
            gustMS: gustMS,
            zaman: zaman,
            alinmaZamani: zaman,
            kaynak: .openMeteo
        )
    }
}

/// Günlük tahmin dizisinin tek elemanı.
struct GunlukRuzgarTahmini: Codable, Identifiable, Equatable {
    var id: Date { gun }
    var gun: Date                // günün 00:00'ı (yerel)
    var maksimumHizMS: Double
    var maksimumGustMS: Double?
    var baskinYonDerece: Double

    var maksimumHizKnot: Double { maksimumHizMS * 1.943844 }

    var maksimumGustKnot: Double? {
        guard let maksimumGustMS else { return nil }
        return maksimumGustMS * 1.943844
    }

    var baskinYonKisaltma: String {
        RuzgarTahmini(zaman: gun, hizMS: maksimumHizMS, yonDerece: baskinYonDerece, gustMS: maksimumGustMS)
            .yonKisaltma
    }
}

/// Bir konum için tek istekte alınan tam paket (anlık + saatlik + günlük).
struct RuzgarTahminSeti: Codable, Equatable {
    var enlem: Double
    var boylam: Double
    var uretimZamani: Date                   // sunucunun tahmini ürettiği/istemcinin aldığı an
    var anlik: RuzgarBilgisi?
    var saatlik: [RuzgarTahmini]             // zamana göre artan
    var gunluk: [GunlukRuzgarTahmini]        // güne göre artan
    var kaynak: RuzgarKaynagi

    /// Verilen andan sonraki ilk `adet` saatlik tahmin (Watch "3 saatlik şerit" için).
    func yaklasanSaatler(_ adet: Int, itibaren: Date = Date()) -> [RuzgarTahmini] {
        saatlik
            .filter { $0.zaman >= itibaren }
            .sorted { $0.zaman < $1.zaman }
            .prefix(adet)
            .map { $0 }
    }

    /// 30 dk'dan eskiyse false.
    var guncelMi: Bool {
        Date().timeIntervalSince(uretimZamani) <= 30 * 60
    }

    /// Konum bu setin konumundan `metre`den daha uzaksa false.
    func kapsiyorMu(_ konum: CLLocation, metre: Double = 2_000) -> Bool {
        let setKonumu = CLLocation(latitude: enlem, longitude: boylam)
        return konum.distance(from: setKonumu) <= metre
    }
}
