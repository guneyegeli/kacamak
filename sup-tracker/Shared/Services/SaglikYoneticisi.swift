import Foundation
import HealthKit
import CoreLocation

/// Apple Sağlık (HealthKit) entegrasyonu: izin, antrenman + rota kaydı.
final class SaglikYoneticisi: NSObject, ObservableObject {
    static let shared = SaglikYoneticisi()

    private let healthStore = HKHealthStore()

    @Published private(set) var yetkiliMi = false

    #if os(watchOS)
    private var aktifOturum: HKWorkoutSession?
    private var aktifBuilder: HKLiveWorkoutBuilder?
    #endif

    private var yazilacakTurler: Set<HKSampleType> {
        var turler: Set<HKSampleType> = [
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute(),
        ]
        if let mesafe = HKObjectType.quantityType(forIdentifier: .distanceSwimming) {
            turler.insert(mesafe)
        }
        if let kalori = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
            turler.insert(kalori)
        }
        return turler
    }

    private var okunacakTurler: Set<HKObjectType> {
        var turler: Set<HKObjectType> = [HKObjectType.workoutType()]
        if let nabiz = HKObjectType.quantityType(forIdentifier: .heartRate) {
            turler.insert(nabiz)
        }
        return turler
    }

    func izinIste(tamamlaninca: @escaping (Bool) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            tamamlaninca(false)
            return
        }
        healthStore.requestAuthorization(toShare: yazilacakTurler, read: okunacakTurler) { [weak self] basarili, _ in
            DispatchQueue.main.async {
                self?.yetkiliMi = basarili
                tamamlaninca(basarili)
            }
        }
    }

    // MARK: - watchOS: canlı antrenman oturumu

    #if os(watchOS)
    func canliOturumBaslat(sporTuru: SporTuru) throws {
        let yapilandirma = HKWorkoutConfiguration()
        yapilandirma.activityType = sporTuru.hkWorkoutActivityType
        yapilandirma.locationType = .outdoor

        let oturum = try HKWorkoutSession(healthStore: healthStore, configuration: yapilandirma)
        let builder = oturum.associatedWorkoutBuilder()
        builder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: yapilandirma)

        aktifOturum = oturum
        aktifBuilder = builder

        let simdi = Date()
        oturum.startActivity(with: simdi)
        builder.beginCollection(withStart: simdi) { _, _ in }
    }

    func canliOturumBitir(tamamlaninca: @escaping (HKWorkout?) -> Void) {
        guard let oturum = aktifOturum, let builder = aktifBuilder else {
            tamamlaninca(nil)
            return
        }
        let simdi = Date()
        oturum.end()
        builder.endCollection(withEnd: simdi) { [weak self] _, _ in
            builder.finishWorkout { antrenman, _ in
                DispatchQueue.main.async {
                    self?.aktifOturum = nil
                    self?.aktifBuilder = nil
                    tamamlaninca(antrenman)
                }
            }
        }
    }
    #endif

    // MARK: - iPhone tek başına kayıt (saat olmadan)

    /// Watch bağlı değilken telefondan doğrudan kaydedilen bir oturumu Sağlık'a yazar.
    func manuelOturumKaydet(_ oturum: RotaOturumu, tamamlaninca: @escaping (Bool) -> Void) {
        guard let bitis = oturum.bitisZamani else {
            tamamlaninca(false)
            return
        }

        var metadata: [String: Any] = [
            HKMetadataKeyIndoorWorkout: false,
        ]
        metadata[HKMetadataKeyAverageSpeed] = oturum.ortalamaHizMS

        let antrenman = HKWorkout(
            activityType: oturum.sporTuru.hkWorkoutActivityType,
            start: oturum.baslangicZamani,
            end: bitis,
            duration: oturum.sureSaniye,
            totalEnergyBurned: oturum.aktifKaloriKcal.map { HKQuantity(unit: .kilocalorie(), doubleValue: $0) },
            totalDistance: HKQuantity(unit: .meter(), doubleValue: oturum.toplamMesafeMetre),
            metadata: metadata
        )

        healthStore.save(antrenman) { [weak self] basarili, _ in
            guard basarili else {
                DispatchQueue.main.async { tamamlaninca(false) }
                return
            }
            self?.rotaEkle(oturum.noktalar, antrenmana: antrenman) { rotaBasarili in
                DispatchQueue.main.async { tamamlaninca(rotaBasarili) }
            }
        }
    }

    private func rotaEkle(_ noktalar: [GPSNoktasi], antrenmana antrenman: HKWorkout, tamamlaninca: @escaping (Bool) -> Void) {
        guard !noktalar.isEmpty else {
            tamamlaninca(true)
            return
        }
        let routeBuilder = HKWorkoutRouteBuilder(healthStore: healthStore, device: nil)
        let clLocations = noktalar.map(\.clLocation)
        routeBuilder.insertRouteData(clLocations) { basarili, _ in
            guard basarili else {
                tamamlaninca(false)
                return
            }
            routeBuilder.finishRoute(with: antrenman, metadata: nil) { _, _ in
                tamamlaninca(true)
            }
        }
    }
}
