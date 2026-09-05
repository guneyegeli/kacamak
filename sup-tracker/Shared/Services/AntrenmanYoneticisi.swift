import Foundation
import CoreLocation
import Combine
#if os(watchOS)
import HealthKit
#endif

/// GPS izleme + (varsa) HealthKit canlı oturumunu birleştirip tek bir RotaOturumu üreten
/// üst düzey koordinatör. Hem iOS hem watchOS hedefinde kullanılır.
final class AntrenmanYoneticisi: ObservableObject {
    static let shared = AntrenmanYoneticisi()

    @Published private(set) var aktifOturum: RotaOturumu?
    @Published private(set) var izlemeDurumu: IzlemeDurumu = .durduruldu
    @Published private(set) var anlikNabiz: Double?

    enum IzlemeDurumu {
        case durduruldu, aktif, duraklatildi
    }

    private let konumYoneticisi = KonumYoneticisi()
    private let saglikYoneticisi = SaglikYoneticisi.shared
    private let depo = OturumDeposu.shared
    private let koprusu = BaglantiKoprusu.shared

    private init() {
        konumYoneticisi.yeniNoktaGeldi = { [weak self] location in
            self?.noktaIsle(location)
        }
    }

    func izinleriIste() {
        konumYoneticisi.izinIste()
        saglikYoneticisi.izinIste { _ in }
    }

    func basla(sporTuru: SporTuru) {
        let cihaz: String
        #if os(watchOS)
        cihaz = "Apple Watch"
        #else
        cihaz = "iPhone"
        #endif

        aktifOturum = RotaOturumu(sporTuru: sporTuru, kaydedenCihaz: cihaz)
        izlemeDurumu = .aktif
        konumYoneticisi.izlemeyeBasla()

        #if os(watchOS)
        try? saglikYoneticisi.canliOturumBaslat(sporTuru: sporTuru)
        #endif
    }

    func duraklat() {
        guard izlemeDurumu == .aktif else { return }
        izlemeDurumu = .duraklatildi
        konumYoneticisi.izlemeyiDurdur()
    }

    func devamEt() {
        guard izlemeDurumu == .duraklatildi else { return }
        izlemeDurumu = .aktif
        konumYoneticisi.izlemeyeBasla()
    }

    func bitir(tamamlaninca: @escaping (RotaOturumu?) -> Void) {
        guard var oturum = aktifOturum else {
            tamamlaninca(nil)
            return
        }
        konumYoneticisi.izlemeyiDurdur()
        izlemeDurumu = .durduruldu
        oturum.bitir()

        #if os(watchOS)
        saglikYoneticisi.canliOturumBitir { antrenman in
            oturum.aktifKaloriKcal = antrenman?.totalEnergyBurned?.doubleValue(for: .kilocalorie())
            self.oturumuSonlandir(oturum, tamamlaninca: tamamlaninca)
        }
        #else
        // Watch bağlı değilse (yalnız iPhone ile kayıt), Sağlık'a manuel yaz.
        if !koprusu.karsiCihazUlasilabilir {
            saglikYoneticisi.manuelOturumKaydet(oturum) { _ in }
        }
        oturumuSonlandir(oturum, tamamlaninca: tamamlaninca)
        #endif
    }

    private func oturumuSonlandir(_ oturum: RotaOturumu, tamamlaninca: @escaping (RotaOturumu?) -> Void) {
        depo.kaydet(oturum)
        koprusu.oturumGonder(oturum)
        aktifOturum = nil
        tamamlaninca(oturum)
    }

    private func noktaIsle(_ location: CLLocation) {
        guard izlemeDurumu == .aktif, var oturum = aktifOturum else { return }
        let nokta = GPSNoktasi(konum: location)
        oturum.noktaEkle(nokta)
        aktifOturum = oturum
        koprusu.canliNoktaGonder(nokta)
    }

    /// Acil durumda, izleme kapalı olsa bile son bilinen / anlık konumu döner.
    func acilDurumIcinKonumAl(tamamlaninca: @escaping (CLLocation?) -> Void) {
        konumYoneticisi.anlikKonumIste(tamamlaninca: tamamlaninca)
    }
}
