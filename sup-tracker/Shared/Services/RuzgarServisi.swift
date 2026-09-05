import Foundation
import CoreLocation
import Combine

enum RuzgarHatasi: LocalizedError {
    case agYok
    case sunucuHatasi(kod: Int)
    case gecersizYanit
    case konumYok
    case kotaAsildi

    var errorDescription: String? {
        switch self {
        case .agYok:
            return "İnternet bağlantısı yok. Rüzgar verisi güncellenemedi."
        case .sunucuHatasi(let kod):
            return "Rüzgar servisi hata döndürdü (kod \(kod))."
        case .gecersizYanit:
            return "Rüzgar verisi okunamadı."
        case .konumYok:
            return "Konum bilgisi alınamadı."
        case .kotaAsildi:
            return "Rüzgar servisi günlük sorgu kotası aşıldı."
        }
    }
}

/// Veri sağlayıcı soyutlaması; Open-Meteo bugün, WeatherKit yarın.
protocol RuzgarSaglayici {
    var kaynak: RuzgarKaynagi { get }
    /// Tek istekte anlık + saatlik + günlük getirir.
    func tahminGetir(
        enlem: Double,
        boylam: Double,
        saatlikSaat: Int,          // kaç saatlik ileri (örn. 48)
        gunlukGun: Int,            // kaç günlük (1-16)
        tamamlaninca: @escaping (Result<RuzgarTahminSeti, RuzgarHatasi>) -> Void
    )
}

/// Open-Meteo uygulaması (anahtarsız). Endpoint ve alan adları STRATEGY.md §2.3.
final class OpenMeteoRuzgarSaglayici: RuzgarSaglayici {
    private let oturum: URLSession

    init(oturum: URLSession = .shared) {
        self.oturum = oturum
    }

    var kaynak: RuzgarKaynagi { .openMeteo }

    func tahminGetir(
        enlem: Double,
        boylam: Double,
        saatlikSaat: Int,
        gunlukGun: Int,
        tamamlaninca: @escaping (Result<RuzgarTahminSeti, RuzgarHatasi>) -> Void
    ) {
        let url = Self.istekURL(enlem: enlem, boylam: boylam, gunlukGun: gunlukGun)

        oturum.dataTask(with: url) { veri, yanit, hata in
            if let hata {
                let nsHata = hata as NSError
                if nsHata.domain == NSURLErrorDomain {
                    DispatchQueue.main.async { tamamlaninca(.failure(.agYok)) }
                } else {
                    DispatchQueue.main.async { tamamlaninca(.failure(.gecersizYanit)) }
                }
                return
            }

            if let http = yanit as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                if http.statusCode == 429 {
                    DispatchQueue.main.async { tamamlaninca(.failure(.kotaAsildi)) }
                } else {
                    DispatchQueue.main.async { tamamlaninca(.failure(.sunucuHatasi(kod: http.statusCode))) }
                }
                return
            }

            guard let veri else {
                DispatchQueue.main.async { tamamlaninca(.failure(.gecersizYanit)) }
                return
            }

            do {
                var set = try Self.ayristir(veri, alinmaZamani: Date())
                if saatlikSaat > 0 {
                    set.saatlik = Array(set.saatlik.prefix(saatlikSaat))
                }
                DispatchQueue.main.async { tamamlaninca(.success(set)) }
            } catch let ruzgarHatasi as RuzgarHatasi {
                DispatchQueue.main.async { tamamlaninca(.failure(ruzgarHatasi)) }
            } catch {
                DispatchQueue.main.async { tamamlaninca(.failure(.gecersizYanit)) }
            }
        }.resume()
    }

    // MARK: - İç kullanım — test edilebilirlik için internal

    static func istekURL(enlem: Double, boylam: Double, gunlukGun: Int) -> URL {
        var bilesenler = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        let gun = min(max(gunlukGun, 1), 16)
        bilesenler.queryItems = [
            URLQueryItem(name: "latitude", value: String(enlem)),
            URLQueryItem(name: "longitude", value: String(boylam)),
            URLQueryItem(name: "current", value: "wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,is_day"),
            URLQueryItem(name: "hourly", value: "wind_speed_10m,wind_direction_10m,wind_gusts_10m"),
            URLQueryItem(name: "daily", value: "wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant"),
            URLQueryItem(name: "wind_speed_unit", value: "ms"),
            URLQueryItem(name: "timezone", value: "UTC"),
            URLQueryItem(name: "timeformat", value: "unixtime"),
            URLQueryItem(name: "forecast_days", value: String(gun)),
        ]
        return bilesenler.url!
    }

    /// Open-Meteo `/v1/forecast` JSON yanıtını `RuzgarTahminSeti`'ye çözer.
    /// `timeformat=unixtime` kullanıldığı için tüm zaman alanları epoch saniye (Int) gelir;
    /// tüm sayısal dizi elemanları modelin kapsamadığı saatlerde `null` olabileceğinden `Double?`'dır.
    static func ayristir(_ veri: Data, alinmaZamani: Date) throws -> RuzgarTahminSeti {
        let cozucu = JSONDecoder()
        let yanit: OpenMeteoYaniti
        do {
            yanit = try cozucu.decode(OpenMeteoYaniti.self, from: veri)
        } catch {
            throw RuzgarHatasi.gecersizYanit
        }

        if yanit.error == true {
            throw RuzgarHatasi.sunucuHatasi(kod: 400)
        }

        var anlik: RuzgarBilgisi?
        if let c = yanit.current, let hiz = c.wind_speed_10m, let yon = c.wind_direction_10m {
            anlik = RuzgarBilgisi(
                hizMS: hiz,
                yonDerece: yon,
                gustMS: c.wind_gusts_10m,
                sicaklikC: c.temperature_2m,
                zaman: Date(timeIntervalSince1970: TimeInterval(c.time)),
                alinmaZamani: alinmaZamani,
                kaynak: .openMeteo
            )
        }

        var saatlik: [RuzgarTahmini] = []
        if let h = yanit.hourly {
            for i in 0..<h.time.count {
                guard i < h.wind_speed_10m.count, i < h.wind_direction_10m.count,
                      let hiz = h.wind_speed_10m[i], let yon = h.wind_direction_10m[i] else { continue }
                let gust: Double? = i < h.wind_gusts_10m.count ? h.wind_gusts_10m[i] : nil
                let zaman = Date(timeIntervalSince1970: TimeInterval(h.time[i]))
                saatlik.append(RuzgarTahmini(zaman: zaman, hizMS: hiz, yonDerece: yon, gustMS: gust))
            }
        }
        saatlik.sort { $0.zaman < $1.zaman }

        var gunluk: [GunlukRuzgarTahmini] = []
        if let d = yanit.daily {
            for i in 0..<d.time.count {
                guard i < d.wind_speed_10m_max.count, i < d.wind_direction_10m_dominant.count,
                      let hiz = d.wind_speed_10m_max[i], let yon = d.wind_direction_10m_dominant[i] else { continue }
                let gust: Double? = i < d.wind_gusts_10m_max.count ? d.wind_gusts_10m_max[i] : nil
                let gun = Date(timeIntervalSince1970: TimeInterval(d.time[i]))
                gunluk.append(GunlukRuzgarTahmini(gun: gun, maksimumHizMS: hiz, maksimumGustMS: gust, baskinYonDerece: yon))
            }
        }
        gunluk.sort { $0.gun < $1.gun }

        return RuzgarTahminSeti(
            enlem: yanit.latitude,
            boylam: yanit.longitude,
            uretimZamani: alinmaZamani,
            anlik: anlik,
            saatlik: saatlik,
            gunluk: gunluk,
            kaynak: .openMeteo
        )
    }

    // MARK: - Ham JSON şeması (STRATEGY.md §2.3) — `_units` alanları kasıtlı olarak yok sayılır.

    private struct OpenMeteoYaniti: Decodable {
        struct AnlikBlok: Decodable {
            let time: Int
            let wind_speed_10m: Double?
            let wind_direction_10m: Double?
            let wind_gusts_10m: Double?
            let temperature_2m: Double?
        }
        struct SaatlikBlok: Decodable {
            let time: [Int]
            let wind_speed_10m: [Double?]
            let wind_direction_10m: [Double?]
            let wind_gusts_10m: [Double?]
        }
        struct GunlukBlok: Decodable {
            let time: [Int]
            let wind_speed_10m_max: [Double?]
            let wind_gusts_10m_max: [Double?]
            let wind_direction_10m_dominant: [Double?]
        }

        let latitude: Double
        let longitude: Double
        let current: AnlikBlok?
        let hourly: SaatlikBlok?
        let daily: GunlukBlok?
        let error: Bool?
        let reason: String?
    }
}

/// iPhone ve Watch'ta ortak; önbellek + sağlayıcı + yayın.
final class RuzgarServisi: ObservableObject {
    static let shared = RuzgarServisi()

    @Published private(set) var anlikRuzgar: RuzgarBilgisi?
    @Published private(set) var tahminSeti: RuzgarTahminSeti?
    @Published private(set) var yukleniyor: Bool = false
    @Published private(set) var sonHata: RuzgarHatasi?
    @Published private(set) var sonGuncelleme: Date?

    private let saglayici: RuzgarSaglayici
    private var zamanlayici: Timer?

    private let onbellekAnahtari = "ruzgar_onbellek_tahmin_seti"
    private let onbellekGecerlilikSaniyesi: TimeInterval = 30 * 60
    private let onbellekMesafeMetre: Double = 2_000
    private let periyodikAralikSaniyesi: TimeInterval = 15 * 60
    private let varsayilanSaatlikSaat = 48
    private let varsayilanGunlukGun = 3

    /// Varsayılan: OpenMeteoRuzgarSaglayici(). Test/geçiş için enjekte edilebilir.
    init(saglayici: RuzgarSaglayici = OpenMeteoRuzgarSaglayici()) {
        self.saglayici = saglayici
        onbellegiYukle()
    }

    /// Önbellek güncelse (≤30 dk ve ≤2 km) ağ isteği atmaz; aksi halde çeker ve yayınlar.
    func guncelle(
        konum: CLLocation,
        zorla: Bool = false,
        tamamlaninca: @escaping (Result<RuzgarTahminSeti, RuzgarHatasi>) -> Void
    ) {
        if !zorla,
           let mevcut = tahminSeti,
           Date().timeIntervalSince(mevcut.uretimZamani) <= onbellekGecerlilikSaniyesi,
           mevcut.kapsiyorMu(konum, metre: onbellekMesafeMetre) {
            tamamlaninca(.success(mevcut))
            return
        }

        yukleniyor = true
        saglayici.tahminGetir(
            enlem: konum.coordinate.latitude,
            boylam: konum.coordinate.longitude,
            saatlikSaat: varsayilanSaatlikSaat,
            gunlukGun: varsayilanGunlukGun
        ) { [weak self] sonuc in
            guard let self else { return }
            self.yukleniyor = false
            switch sonuc {
            case .success(let set):
                self.sonHata = nil
                self.sonGuncelleme = Date()
                self.tahminSeti = set
                self.anlikRuzgar = set.anlik
                self.onbellegiKaydet()
                tamamlaninca(.success(set))
            case .failure(let hata):
                self.sonHata = hata
                tamamlaninca(.failure(hata))
            }
        }
    }

    /// Sadece anlık değeri isteyen çağıranlar için kısayol (guncelle'yi sarar).
    func anlikRuzgarGetir(konum: CLLocation, tamamlaninca: @escaping (Result<RuzgarBilgisi, RuzgarHatasi>) -> Void) {
        guncelle(konum: konum) { sonuc in
            switch sonuc {
            case .success(let set):
                if let anlik = set.anlik {
                    tamamlaninca(.success(anlik))
                } else {
                    tamamlaninca(.failure(.gecersizYanit))
                }
            case .failure(let hata):
                tamamlaninca(.failure(hata))
            }
        }
    }

    /// Karşı cihazdan (WatchConnectivity) gelen seti kabul eder; daha yeniyse yayınlar.
    func disKaynaktanUygula(_ set: RuzgarTahminSeti) {
        DispatchQueue.main.async {
            if let mevcut = self.tahminSeti, mevcut.uretimZamani >= set.uretimZamani {
                return
            }
            self.tahminSeti = set
            self.anlikRuzgar = set.anlik
            self.sonGuncelleme = Date()
            self.onbellegiKaydet()
        }
    }

    /// Oturum boyunca 15 dk'da bir `guncelle` çağıran zamanlayıcı.
    func periyodikGuncellemeyiBaslat(konumSaglayici: @escaping () -> CLLocation?) {
        periyodikGuncellemeyiDurdur()

        if let konum = konumSaglayici() {
            guncelle(konum: konum) { _ in }
        }

        let yeniZamanlayici = Timer(timeInterval: periyodikAralikSaniyesi, repeats: true) { [weak self] _ in
            guard let self, let konum = konumSaglayici() else { return }
            self.guncelle(konum: konum) { _ in }
        }
        RunLoop.main.add(yeniZamanlayici, forMode: .common)
        zamanlayici = yeniZamanlayici
    }

    func periyodikGuncellemeyiDurdur() {
        zamanlayici?.invalidate()
        zamanlayici = nil
    }

    /// Diske (UserDefaults/JSON) son set; uygulama açılışında okunur.
    func onbellegiKaydet() {
        guard let set = tahminSeti, let veri = try? JSONEncoder().encode(set) else { return }
        UserDefaults.standard.set(veri, forKey: onbellekAnahtari)
    }

    func onbellegiYukle() {
        guard let veri = UserDefaults.standard.data(forKey: onbellekAnahtari),
              let set = try? JSONDecoder().decode(RuzgarTahminSeti.self, from: veri) else { return }
        tahminSeti = set
        anlikRuzgar = set.anlik
    }
}
