import Foundation
import CoreLocation
import Combine
#if os(watchOS)
import HealthKit
#endif

/// GPS izleme + (varsa) HealthKit canlı oturumunu, kürek performansı ve rüzgar
/// verisini birleştirip tek bir RotaOturumu üreten üst düzey koordinatör.
/// Hem iOS hem watchOS hedefinde kullanılır.
final class AntrenmanYoneticisi: ObservableObject {
    static let shared = AntrenmanYoneticisi()

    @Published private(set) var aktifOturum: RotaOturumu?
    @Published private(set) var izlemeDurumu: IzlemeDurumu = .durduruldu
    @Published private(set) var anlikNabiz: Double?
    @Published private(set) var anlikKaloriKcal: Double?
    @Published private(set) var anlikHizMS: Double?
    @Published private(set) var anlikRuzgar: RuzgarBilgisi?

    enum IzlemeDurumu {
        case durduruldu, aktif, duraklatildi
    }

    let kurekSayaci = KurekSayaci()
    let ruzgarServisi = RuzgarServisi.shared

    private let konumYoneticisi = KonumYoneticisi()
    private let saglikYoneticisi = SaglikYoneticisi.shared
    private let depo = OturumDeposu.shared
    private let koprusu = BaglantiKoprusu.shared
    private var iptaller = Set<AnyCancellable>()

    private init() {
        konumYoneticisi.yeniNoktaGeldi = { [weak self] location in
            self?.noktaIsle(location)
        }

        ruzgarServisi.$anlikRuzgar
            .receive(on: DispatchQueue.main)
            .sink { [weak self] ruzgar in
                guard let self, let ruzgar else { return }
                self.anlikRuzgar = ruzgar
                self.aktifOturum?.ruzgarGuncelle(ruzgar)
                #if os(iOS)
                // Yalnızca iPhone tam tahmin setini çeker; alındığında Watch'a iletilir.
                if let set = self.ruzgarServisi.tahminSeti {
                    self.koprusu.ruzgarGonder(set)
                }
                #endif
            }
            .store(in: &iptaller)

        koprusu.ruzgarAlindi = { [weak self] set in
            self?.ruzgarServisi.disKaynaktanUygula(set)
        }

        #if os(watchOS)
        // Not: `canliVeriGuncellendi` her çağrıda yalnızca bir metriği taşır (diğeri nil);
        // bu yüzden yalnızca dolu olan değeri güncelliyoruz, diğerini sıfırlamıyoruz.
        saglikYoneticisi.canliVeriGuncellendi = { [weak self] nabiz, kalori in
            if let nabiz { self?.anlikNabiz = nabiz }
            if let kalori { self?.anlikKaloriKcal = kalori }
        }
        #endif
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
        anlikNabiz = nil
        anlikKaloriKcal = nil
        konumYoneticisi.izlemeyeBasla()

        kurekSayaci.basla(sporTuru: sporTuru)
        ruzgarServisi.periyodikGuncellemeyiBaslat { [weak self] in self?.konumYoneticisi.guncelKonum }

        #if os(watchOS)
        try? saglikYoneticisi.canliOturumBaslat(sporTuru: sporTuru)
        #endif
    }

    func duraklat() {
        guard izlemeDurumu == .aktif else { return }
        izlemeDurumu = .duraklatildi
        konumYoneticisi.izlemeyiDurdur()
        kurekSayaci.duraklat()
    }

    func devamEt() {
        guard izlemeDurumu == .duraklatildi else { return }
        izlemeDurumu = .aktif
        konumYoneticisi.izlemeyeBasla()
        kurekSayaci.devamEt()
    }

    func bitir(tamamlaninca: @escaping (RotaOturumu?) -> Void) {
        guard var oturum = aktifOturum else {
            tamamlaninca(nil)
            return
        }
        konumYoneticisi.izlemeyiDurdur()
        izlemeDurumu = .durduruldu
        oturum.bitir()

        kurekSayaci.durdur()
        oturum.kurekOzetiUygula(kurekSayaci.ozet)
        ruzgarServisi.periyodikGuncellemeyiDurdur()

        #if os(watchOS)
        saglikYoneticisi.canliOturumBitir { antrenman in
            oturum.aktifKaloriKcal = antrenman?.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? self.anlikKaloriKcal
            self.oturumuSonlandir(oturum, tamamlaninca: tamamlaninca)
        }
        #else
        oturum.aktifKaloriKcal = oturum.aktifKaloriKcal ?? anlikKaloriKcal
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
        kurekSayaci.sifirla()
        tamamlaninca(oturum)
    }

    private func noktaIsle(_ location: CLLocation) {
        guard izlemeDurumu == .aktif, var oturum = aktifOturum else { return }
        let nokta = GPSNoktasi(konum: location)
        oturum.noktaEkle(nokta)
        aktifOturum = oturum
        anlikHizMS = nokta.hizMS
        kurekSayaci.mesafeGuncelle(toplamMesafeMetre: oturum.toplamMesafeMetre)
        koprusu.canliNoktaGonder(nokta)
    }

    /// Acil durumda, izleme kapalı olsa bile son bilinen / anlık konumu döner.
    func acilDurumIcinKonumAl(tamamlaninca: @escaping (CLLocation?) -> Void) {
        konumYoneticisi.anlikKonumIste(tamamlaninca: tamamlaninca)
    }
}
