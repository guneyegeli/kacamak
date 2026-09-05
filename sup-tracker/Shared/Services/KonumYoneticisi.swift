import Foundation
import CoreLocation
import Combine

/// Açık su GPS rota kaydını yöneten sınıf. iPhone ve Apple Watch'ta ortak kullanılır.
final class KonumYoneticisi: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published private(set) var yetkiDurumu: CLAuthorizationStatus = .notDetermined
    @Published private(set) var guncelKonum: CLLocation?
    @Published private(set) var izlemeAktif = false

    /// Yeni bir GPS noktası geldiğinde tetiklenir; RotaOturumu'na eklemek için dinlenir.
    var yeniNoktaGeldi: ((CLLocation) -> Void)?

    private let yonetici = CLLocationManager()

    override init() {
        super.init()
        yonetici.delegate = self
        yonetici.desiredAccuracy = kCLLocationAccuracyBest
        // Su üstünde GPS sinyali karadan daha zayıf düşebilir; sürekli konum modunu tercih ediyoruz.
        yonetici.activityType = .fitness
        yonetici.distanceFilter = 3 // metre
        #if os(iOS)
        yonetici.allowsBackgroundLocationUpdates = true
        yonetici.pausesLocationUpdatesAutomatically = false
        yonetici.showsBackgroundLocationIndicator = true
        #endif
    }

    func izinIste() {
        #if os(iOS)
        yonetici.requestAlwaysAuthorization()
        #else
        yonetici.requestWhenInUseAuthorization()
        #endif
    }

    func izlemeyeBasla() {
        izlemeAktif = true
        yonetici.startUpdatingLocation()
    }

    func izlemeyiDurdur() {
        izlemeAktif = false
        yonetici.stopUpdatingLocation()
    }

    /// Acil durumda tek seferlik güncel konum ister (izleme aktif olmasa bile).
    func anlikKonumIste(tamamlaninca: @escaping (CLLocation?) -> Void) {
        if let mevcut = guncelKonum, Date().timeIntervalSince(mevcut.timestamp) < 15 {
            tamamlaninca(mevcut)
            return
        }
        anlikIstekTamamlandi = tamamlaninca
        yonetici.requestLocation()
    }

    private var anlikIstekTamamlandi: ((CLLocation?) -> Void)?

    // MARK: - CLLocationManagerDelegate

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        yetkiDurumu = manager.authorizationStatus
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let sonKonum = locations.last, sonKonum.horizontalAccuracy >= 0, sonKonum.horizontalAccuracy < 50 else { return }
        guncelKonum = sonKonum
        if izlemeAktif {
            yeniNoktaGeldi?(sonKonum)
        }
        if let tamamlandi = anlikIstekTamamlandi {
            anlikIstekTamamlandi = nil
            tamamlandi(sonKonum)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if let tamamlandi = anlikIstekTamamlandi {
            anlikIstekTamamlandi = nil
            tamamlandi(nil)
        }
    }
}
