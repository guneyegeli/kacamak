import Foundation
import Combine
#if os(watchOS)
import CoreMotion
#endif

// MARK: - Algılama ayarları (STRATEGY.md §3.2 sabitler tablosu)

/// Spor türüne göre kürek algılama algoritması sabitleri.
struct KurekAlgilamaAyari: Equatable {
    var minAralikSaniye: TimeInterval   // refractory (debounce)
    var tabanEsikG: Double              // g cinsinden taban eşik
    var esikCarpani: Double             // rms'e göre uyarlanabilir eşik çarpanı
    var duraksamaSaniye: TimeInterval   // bu süre kürek yoksa hız 0'a düşer
    var ornekHz: Double                 // CoreMotion örnekleme frekansı

    /// Spor türüne göre varsayılan sabitler (STRATEGY.md §3.2).
    static func varsayilan(_ sporTuru: SporTuru) -> KurekAlgilamaAyari {
        switch sporTuru {
        case .sup: return .sup
        case .kano: return .kano
        case .kurek: return .kurek
        case .yelken, .acikSuYuzme, .kiteSorf, .surf: return .sup
        }
    }

    static let sup = KurekAlgilamaAyari(
        minAralikSaniye: 0.45, tabanEsikG: 0.12, esikCarpani: 1.2, duraksamaSaniye: 4, ornekHz: 50
    )
    static let kano = KurekAlgilamaAyari(
        minAralikSaniye: 0.35, tabanEsikG: 0.10, esikCarpani: 1.2, duraksamaSaniye: 4, ornekHz: 50
    )
    static let kurek = KurekAlgilamaAyari(
        minAralikSaniye: 0.60, tabanEsikG: 0.15, esikCarpani: 1.3, duraksamaSaniye: 5, ornekHz: 50
    )
}

/// Ayarlar'da kullanıcının seçtiği kürek algılama hassasiyeti (STRATEGY.md §3.4).
enum KurekHassasiyeti: String, Codable, CaseIterable {
    case dusuk, normal, yuksek

    /// `KurekAlgilamaAyari.esikCarpani`'nın üzerine uygulanacak çarpan.
    var esikCarpani: Double {
        switch self {
        case .dusuk: return 1.4
        case .normal: return 1.2
        case .yuksek: return 1.0
        }
    }
}

// MARK: - Özet

/// Oturum bitişinde `RotaOturumu.kurekOzetiUygula(_:)`'ye verilecek özet.
struct KurekOzeti: Codable, Equatable {
    var kurekSayisi: Int
    var ortalamaKurekHizi: Double?
    var maksimumKurekHizi: Double?
    var kurekBasinaMesafeMetre: Double?
    var ortalamaGucEndeksi: Double?
}

extension SporTuru {
    /// Bilek ivmeölçeriyle kürek sayımı bu sporlarda anlamlı: SUP, Kano/Kayak, Kürek.
    var kurekSayimiDestekleniyor: Bool {
        switch self {
        case .sup, .kano, .kurek: return true
        case .yelken, .acikSuYuzme, .kiteSorf, .surf: return false
        }
    }
}

/// Bilek ivmeölçerinden (CoreMotion `deviceMotion`) kürek çekişlerini sayar,
/// tempo/verimlilik/efor metriklerini türetir. Yalnızca watchOS'ta gerçek
/// sensör işleme yapar; iOS hedefinde tüm fonksiyonlar no-op'tur (bkz. STRATEGY.md §3.1, §5.4).
///
/// Ağır sinyal işleme her zaman `sensorKuyrugu` üzerinde çalışır; `@Published`
/// alanlar yalnızca ana kuyrukta ve saniyede ~1 kez (`periyodikTik`/`yayinla`) güncellenir.
final class KurekSayaci: ObservableObject {
    @Published private(set) var kurekSayisi: Int = 0
    @Published private(set) var kurekHiziDakika: Double = 0
    @Published private(set) var ortalamaKurekHizi: Double?
    @Published private(set) var maksimumKurekHizi: Double?
    @Published private(set) var kurekBasinaMesafeMetre: Double?
    @Published private(set) var kurekGucuEndeksi: Double?
    @Published private(set) var sonKurekZamani: Date?
    @Published private(set) var son60SaniyeHizlari: [Double] = []
    @Published private(set) var calisiyor: Bool = false
    @Published private(set) var sensorHatasi: String?

    /// Hassasiyet değişince (`KurekHassasiyeti.esikCarpani`) veya spor türü
    /// değişince güncellenir. NOT: dışarıdan doğrudan atanabildiği için (contract
    /// gereği) `sensorKuyrugu` dışında da yazılabilir; bu, struct'ın küçük
    /// alanları için kabul edilebilir, göz ardı edilebilir bir veri yarışı riski taşır.
    var ayar: KurekAlgilamaAyari {
        didSet {
            #if os(watchOS)
            hareketYoneticisi?.deviceMotionUpdateInterval = 1.0 / ayar.ornekHz
            #endif
        }
    }

    private(set) var sporTuru: SporTuru = .sup

    init(ayar: KurekAlgilamaAyari = .sup) {
        self.ayar = ayar
    }

    // MARK: watchOS — sensör kuyruğu ve iç durum

    #if os(watchOS)
    /// Tüm sinyal işleme, durum makinesi ve tampon erişimi bu seri kuyrukta yapılır.
    private let sensorKuyrugu = DispatchQueue(label: "com.kacamak.kureksayaci.sensor")
    private lazy var motionKuyrugu: OperationQueue = {
        let kuyruk = OperationQueue()
        kuyruk.name = "com.kacamak.kureksayaci.motion"
        kuyruk.maxConcurrentOperationCount = 1
        kuyruk.underlyingQueue = sensorKuyrugu
        return kuyruk
    }()
    private var hareketYoneticisi: CMMotionManager?
    private var zamanlayici: DispatchSourceTimer?

    // Sinyal işleme durumu (yalnızca sensorKuyrugu üzerinde okunur/yazılır).
    private var yavasOrt: Double = 0
    private var duzgun: Double = 0
    private var enerjiKare: Double = 0
    private var sonOrnekZamani: Date?
    private enum TepeDurumu { case bekle, yukseliyor }
    private var tepeDurumu: TepeDurumu = .bekle
    private var tepeDeger: Double = 0
    private var tepeZamaniIc: Date?
    private var sonKurekZamaniIc: Date?

    // Kürek hızı / tepe tamponları.
    private var sonTepeZamanlari: [Date] = []      // N=6 formülü (halkaTampon)
    private var son10sTepeZamanlari: [Date] = []   // 10 s pencere maksimumu için
    private var kurekHiziDakikaIc: Double = 0
    private var maksimumKurekHizIc: Double?

    // Efor endeksi.
    private var sonGenlikler: [Double] = []        // son 10 tepe genliği
    private var oturumMaksimumHamSkor: Double = 0
    private var gucEndeksiToplam: Double = 0
    private var gucEndeksiSayisi: Int = 0
    private var kurekGucuEndeksiIc: Double?

    // Mesafe / verimlilik (mesafeGuncelle ile beslenir).
    private var sonBilinenMesafeMetre: Double = 0
    private var mesafeGecmisi: [(zaman: Date, mesafe: Double, kurekSayisi: Int)] = []
    private var kurekBasinaMesafeIc: Double?

    // Aktif süre (duraklatma hariç) ve genel durum.
    private var aktifBaslangicZamani: Date?
    private var toplamAktifSureSaniye: TimeInterval = 0
    private var kurekSayisiIc: Int = 0
    private var son60SaniyeHizlariIc: [Double] = []
    private var kovaTikSayaci: Int = 0
    private var calisiyorIc: Bool = false
    private var duraklatildi: Bool = false
    #endif

    // MARK: - Genel arayüz (STRATEGY.md §5.4)

    /// deviceMotion akışını başlatır; sporTuru desteklemiyorsa no-op ve calisiyor=false.
    func basla(sporTuru: SporTuru) {
        #if os(watchOS)
        self.sporTuru = sporTuru
        guard sporTuru.kurekSayimiDestekleniyor else {
            DispatchQueue.main.async { [weak self] in self?.calisiyor = false }
            return
        }
        ayar = KurekAlgilamaAyari.varsayilan(sporTuru)

        sensorKuyrugu.sync { [weak self] in
            guard let self else { return }
            self.tamSifirla()
            self.calisiyorIc = true
            self.aktifBaslangicZamani = Date()
        }

        hareketiBaslat()
        zamanlayiciyiBaslat()

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.kurekSayisi = 0
            self.kurekHiziDakika = 0
            self.ortalamaKurekHizi = nil
            self.maksimumKurekHizi = nil
            self.kurekBasinaMesafeMetre = nil
            self.kurekGucuEndeksi = nil
            self.sonKurekZamani = nil
            self.son60SaniyeHizlari = []
            self.sensorHatasi = nil
            self.calisiyor = true
        }
        #endif
    }

    /// Sayım durur, birikim korunur.
    func duraklat() {
        #if os(watchOS)
        hareketiDurdur()
        sensorKuyrugu.async { [weak self] in
            guard let self, self.calisiyorIc, !self.duraklatildi else { return }
            self.duraklatildi = true
            if let baslangic = self.aktifBaslangicZamani {
                self.toplamAktifSureSaniye += Date().timeIntervalSince(baslangic)
                self.aktifBaslangicZamani = nil
            }
            // Uzun duraklamada yanlış tepe oluşmaması için geçiş durumunu sıfırla.
            self.tepeDurumu = .bekle
            self.tepeDeger = 0
            self.yavasOrt = 0
            self.duzgun = 0
            self.enerjiKare = 0
            self.sonOrnekZamani = nil
        }
        #endif
    }

    func devamEt() {
        #if os(watchOS)
        sensorKuyrugu.async { [weak self] in
            guard let self, self.calisiyorIc, self.duraklatildi else { return }
            self.duraklatildi = false
            self.aktifBaslangicZamani = Date()
        }
        hareketiBaslat()
        #endif
    }

    /// Akışı kapatır, değerler korunur (özet için).
    func durdur() {
        #if os(watchOS)
        hareketiDurdur()
        zamanlayiciyiDurdur()
        sensorKuyrugu.sync { [weak self] in
            guard let self else { return }
            if let baslangic = self.aktifBaslangicZamani {
                self.toplamAktifSureSaniye += Date().timeIntervalSince(baslangic)
                self.aktifBaslangicZamani = nil
            }
            self.calisiyorIc = false
            self.duraklatildi = false
            self.yayinla()
        }
        DispatchQueue.main.async { [weak self] in self?.calisiyor = false }
        #endif
    }

    func sifirla() {
        #if os(watchOS)
        sensorKuyrugu.sync { [weak self] in self?.tamSifirla() }
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.kurekSayisi = 0
            self.kurekHiziDakika = 0
            self.ortalamaKurekHizi = nil
            self.maksimumKurekHizi = nil
            self.kurekBasinaMesafeMetre = nil
            self.kurekGucuEndeksi = nil
            self.sonKurekZamani = nil
            self.son60SaniyeHizlari = []
            self.calisiyor = false
            self.sensorHatasi = nil
        }
        #endif
    }

    /// AntrenmanYoneticisi her GPS noktasında çağırır; mesafe/kürek hesabı için.
    func mesafeGuncelle(toplamMesafeMetre: Double) {
        #if os(watchOS)
        let simdi = Date()
        sensorKuyrugu.async { [weak self] in
            guard let self, self.calisiyorIc else { return }
            self.sonBilinenMesafeMetre = toplamMesafeMetre
            self.mesafeGecmisi.append((zaman: simdi, mesafe: toplamMesafeMetre, kurekSayisi: self.kurekSayisiIc))
            self.mesafeGecmisi.removeAll { simdi.timeIntervalSince($0.zaman) > 35 }
            self.kurekBasinaMesafeIc = self.hesaplaKurekBasinaMesafe(simdi: simdi)
        }
        #endif
    }

    /// Oturum bittiğinde RotaOturumu'na yazılacak özet.
    var ozet: KurekOzeti {
        #if os(watchOS)
        return sensorKuyrugu.sync {
            let aktifSure = guncelAktifSureSaniye()
            let ortalamaHiz: Double? = (aktifSure > 0 && kurekSayisiIc > 0)
                ? Double(kurekSayisiIc) / (aktifSure / 60) : nil
            let mesafeBasi: Double? = kurekSayisiIc > 0
                ? sonBilinenMesafeMetre / Double(kurekSayisiIc) : nil
            let ortalamaEndeks: Double? = gucEndeksiSayisi > 0
                ? gucEndeksiToplam / Double(gucEndeksiSayisi) : nil
            return KurekOzeti(
                kurekSayisi: kurekSayisiIc,
                ortalamaKurekHizi: ortalamaHiz,
                maksimumKurekHizi: maksimumKurekHizIc,
                kurekBasinaMesafeMetre: mesafeBasi,
                ortalamaGucEndeksi: ortalamaEndeks
            )
        }
        #else
        return KurekOzeti(
            kurekSayisi: 0, ortalamaKurekHizi: nil, maksimumKurekHizi: nil,
            kurekBasinaMesafeMetre: nil, ortalamaGucEndeksi: nil
        )
        #endif
    }

    // MARK: - watchOS iç uygulama (STRATEGY.md §3.1-3.2)

    #if os(watchOS)
    private func hareketiBaslat() {
        let yonetici = hareketYoneticisi ?? CMMotionManager()
        guard yonetici.isDeviceMotionAvailable else {
            DispatchQueue.main.async { [weak self] in
                self?.sensorHatasi = "Hareket sensörü bu cihazda kullanılamıyor."
            }
            return
        }
        yonetici.deviceMotionUpdateInterval = 1.0 / ayar.ornekHz
        hareketYoneticisi = yonetici
        yonetici.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: motionKuyrugu) { [weak self] motion, error in
            guard let self else { return }
            if let error {
                DispatchQueue.main.async { self.sensorHatasi = error.localizedDescription }
                return
            }
            guard let motion else { return }
            self.ornekIsle(motion)
        }
    }

    private func hareketiDurdur() {
        hareketYoneticisi?.stopDeviceMotionUpdates()
    }

    /// Her deviceMotion örneği için O(1) sinyal işleme (STRATEGY.md §3.2 adım 1-5).
    /// `sensorKuyrugu` (motionKuyrugu'nun underlyingQueue'su) üzerinde çalışır.
    private func ornekIsle(_ motion: CMDeviceMotion) {
        let simdi = Date()
        let ua = motion.userAcceleration
        let buyukluk = (ua.x * ua.x + ua.y * ua.y + ua.z * ua.z).squareRoot()

        let dt: TimeInterval
        if let sonOrnekZamani {
            let fark = simdi.timeIntervalSince(sonOrnekZamani)
            dt = (fark > 0 && fark < 1.0) ? fark : (1.0 / ayar.ornekHz)
        } else {
            dt = 1.0 / ayar.ornekHz
        }
        sonOrnekZamani = simdi

        // 1-2. yavaş ortalama (DC/sallanma) çıkar → yüksek geçiş sinyali.
        yavasOrt = ema(mevcut: yavasOrt, yeni: buyukluk, dt: dt, tau: 1.0)
        let yuksekGecis = buyukluk - yavasOrt

        // 3. düzgünleştir (band-pass ≈ 0.16-2 Hz).
        duzgun = ema(mevcut: duzgun, yeni: yuksekGecis, dt: dt, tau: 0.08)

        // 4. enerji (rms) → uyarlanabilir eşik.
        enerjiKare = ema(mevcut: enerjiKare, yeni: duzgun * duzgun, dt: dt, tau: 5.0)
        let rms = enerjiKare.squareRoot()
        let esik = max(ayar.tabanEsikG, ayar.esikCarpani * rms)

        // 5. tepe tespiti (durum makinesi, histerezis esik×0.5).
        switch tepeDurumu {
        case .bekle:
            if duzgun > esik {
                tepeDurumu = .yukseliyor
                tepeDeger = duzgun
                tepeZamaniIc = simdi
            }
        case .yukseliyor:
            if duzgun > tepeDeger {
                tepeDeger = duzgun
                tepeZamaniIc = simdi
            }
            if duzgun < esik * 0.5 {
                tepeyiSonlandir(zaman: tepeZamaniIc ?? simdi, genlik: tepeDeger)
                tepeDurumu = .bekle
                tepeDeger = 0
            }
        }
    }

    private func ema(mevcut: Double, yeni: Double, dt: TimeInterval, tau: Double) -> Double {
        let alfa = 1 - exp(-dt / tau)
        return mevcut + alfa * (yeni - mevcut)
    }

    /// Bir tepe kesinleştiğinde: refractory kontrolü, kabul, türetilmiş metrikler
    /// (STRATEGY.md §3.2 adım 5-6 "Kabul" ve §3.3). Yalnızca iç durumu günceller;
    /// `@Published` yayını `periyodikTik`/`yayinla` ile ~1 Hz'de yapılır.
    private func tepeyiSonlandir(zaman: Date, genlik: Double) {
        if let sonKurekZamaniIc, zaman.timeIntervalSince(sonKurekZamaniIc) < ayar.minAralikSaniye {
            return // refractory içinde, yoksay
        }
        sonKurekZamaniIc = zaman
        kurekSayisiIc += 1

        sonTepeZamanlari.append(zaman)
        if sonTepeZamanlari.count > 6 {
            sonTepeZamanlari.removeFirst(sonTepeZamanlari.count - 6)
        }
        son10sTepeZamanlari.append(zaman)
        son10sTepeZamanlari.removeAll { zaman.timeIntervalSince($0) > 10 }

        sonGenlikler.append(genlik)
        if sonGenlikler.count > 10 {
            sonGenlikler.removeFirst(sonGenlikler.count - 10)
        }

        // 6. Kürek hızı: son N=6 tepe → 60×(N-1)/(t_son-t_ilk); N<3 tek aralıktan kaba tahmin;
        //    yayınlanan değer EMA(τ=3s) ile yumuşatılır.
        let hamHiz = anlikHamHiz()
        let dtHiz: TimeInterval
        if sonTepeZamanlari.count >= 2 {
            dtHiz = max(0.01, zaman.timeIntervalSince(sonTepeZamanlari[sonTepeZamanlari.count - 2]))
        } else {
            dtHiz = 1.0 / ayar.ornekHz
        }
        kurekHiziDakikaIc = ema(mevcut: kurekHiziDakikaIc, yeni: hamHiz, dt: dtHiz, tau: 3.0)

        // Maksimum kürek hızı: 10 s pencerelerde maks (oturum boyunca en yükseği tutulur).
        if son10sTepeZamanlari.count >= 2,
           let ilk = son10sTepeZamanlari.first, let son = son10sTepeZamanlari.last {
            let aralik = son.timeIntervalSince(ilk)
            if aralik > 0 {
                let pencereHizi = 60 * Double(son10sTepeZamanlari.count - 1) / aralik
                maksimumKurekHizIc = max(maksimumKurekHizIc ?? 0, pencereHizi)
            }
        }

        // Efor endeksi: son 10 tepenin ort. genliği × kürek hızı, oturum içi maksimuma göre 0-100.
        let ortalamaGenlik = sonGenlikler.reduce(0, +) / Double(sonGenlikler.count)
        let hamSkor = ortalamaGenlik * max(kurekHiziDakikaIc, 1)
        oturumMaksimumHamSkor = max(oturumMaksimumHamSkor, hamSkor)
        if oturumMaksimumHamSkor > 0 {
            let endeks = min(100, max(0, hamSkor / oturumMaksimumHamSkor * 100))
            kurekGucuEndeksiIc = endeks
            gucEndeksiToplam += endeks
            gucEndeksiSayisi += 1
        }

        // Kürek başına mesafe (canlı, son 30 s penceresi).
        kurekBasinaMesafeIc = hesaplaKurekBasinaMesafe(simdi: zaman)
    }

    private func anlikHamHiz() -> Double {
        let n = sonTepeZamanlari.count
        guard n >= 2 else { return 0 }
        if n >= 3, let ilk = sonTepeZamanlari.first, let son = sonTepeZamanlari.last {
            let aralik = son.timeIntervalSince(ilk)
            guard aralik > 0 else { return 0 }
            return 60 * Double(n - 1) / aralik
        } else {
            let aralik = sonTepeZamanlari[1].timeIntervalSince(sonTepeZamanlari[0])
            guard aralik > 0 else { return 0 }
            return 60 / aralik
        }
    }

    /// Son 30 s'de Δ(toplam mesafe) / Δ(kürek sayısı) — verimlilik (STRATEGY.md §3.3).
    private func hesaplaKurekBasinaMesafe(simdi: Date) -> Double? {
        guard let eski = mesafeGecmisi.first(where: { simdi.timeIntervalSince($0.zaman) <= 30 }) else { return nil }
        let dKurek = kurekSayisiIc - eski.kurekSayisi
        guard dKurek > 0 else { return nil }
        return (sonBilinenMesafeMetre - eski.mesafe) / Double(dKurek)
    }

    private func guncelAktifSureSaniye() -> TimeInterval {
        var toplam = toplamAktifSureSaniye
        if let baslangic = aktifBaslangicZamani {
            toplam += Date().timeIntervalSince(baslangic)
        }
        return toplam
    }

    private func zamanlayiciyiBaslat() {
        zamanlayici?.cancel()
        let t = DispatchSource.makeTimerSource(queue: sensorKuyrugu)
        t.schedule(deadline: .now() + 1, repeating: 1.0)
        t.setEventHandler { [weak self] in self?.periyodikTik() }
        zamanlayici = t
        t.resume()
    }

    private func zamanlayiciyiDurdur() {
        zamanlayici?.cancel()
        zamanlayici = nil
    }

    /// 1 Hz'de çalışır (sensorKuyrugu üzerinde): duraksama kontrolü, watchdog,
    /// mini grafik kovaları ve ana kuyruğa yayın (STRATEGY.md §3.2 adım 7, §3.1 watchdog).
    private func periyodikTik() {
        let simdi = Date()

        // 7. Duraksama: kürek çekilmiyorsa hız 0'a döner, halkaTampon temizlenir.
        if let sonKurekZamaniIc, simdi.timeIntervalSince(sonKurekZamaniIc) > ayar.duraksamaSaniye {
            kurekHiziDakikaIc = 0
            sonTepeZamanlari.removeAll()
        }

        // Watchdog: 3 s veri gelmezse akışı yeniden başlat.
        if calisiyorIc, !duraklatildi, let sonOrnekZamani, simdi.timeIntervalSince(sonOrnekZamani) > 3 {
            hareketiDurdur()
            self.sonOrnekZamani = Date()
            hareketiBaslat()
        }

        // Mini grafik: 12 × 5 s kova.
        kovaTikSayaci += 1
        if kovaTikSayaci >= 5 {
            kovaTikSayaci = 0
            son60SaniyeHizlariIc.append(kurekHiziDakikaIc)
            if son60SaniyeHizlariIc.count > 12 {
                son60SaniyeHizlariIc.removeFirst(son60SaniyeHizlariIc.count - 12)
            }
        }

        yayinla()
    }

    /// `sensorKuyrugu` üzerinde çalışırken çağrılmalıdır (invariant); iç durumu
    /// anlık kopyalar ve ana kuyrukta `@Published` alanlara tek seferde yazar.
    private func yayinla() {
        let aktifSure = guncelAktifSureSaniye()
        let sayisi = kurekSayisiIc
        let hiz = kurekHiziDakikaIc
        let ortalamaHiz: Double? = (aktifSure > 0 && sayisi > 0) ? Double(sayisi) / (aktifSure / 60) : nil
        let maks = maksimumKurekHizIc
        let mesafeBasi = kurekBasinaMesafeIc
        let endeks = kurekGucuEndeksiIc
        let sonZaman = sonKurekZamaniIc
        let kovalar = son60SaniyeHizlariIc

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.kurekSayisi = sayisi
            self.kurekHiziDakika = hiz
            self.ortalamaKurekHizi = ortalamaHiz
            self.maksimumKurekHizi = maks
            self.kurekBasinaMesafeMetre = mesafeBasi
            self.kurekGucuEndeksi = endeks
            self.sonKurekZamani = sonZaman
            self.son60SaniyeHizlari = kovalar
        }
    }

    private func tamSifirla() {
        kurekSayisiIc = 0
        kurekHiziDakikaIc = 0
        maksimumKurekHizIc = nil
        kurekBasinaMesafeIc = nil
        kurekGucuEndeksiIc = nil
        sonKurekZamaniIc = nil
        son60SaniyeHizlariIc = []

        yavasOrt = 0
        duzgun = 0
        enerjiKare = 0
        sonOrnekZamani = nil
        tepeDurumu = .bekle
        tepeDeger = 0
        tepeZamaniIc = nil

        sonTepeZamanlari = []
        son10sTepeZamanlari = []
        sonGenlikler = []
        oturumMaksimumHamSkor = 0
        gucEndeksiToplam = 0
        gucEndeksiSayisi = 0

        sonBilinenMesafeMetre = 0
        mesafeGecmisi = []

        aktifBaslangicZamani = nil
        toplamAktifSureSaniye = 0
        kovaTikSayaci = 0
        duraklatildi = false
    }
    #endif
}
