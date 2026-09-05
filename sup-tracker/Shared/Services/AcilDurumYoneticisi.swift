import Foundation
import CoreLocation
#if os(iOS)
import MessageUI
import UIKit
#elseif os(watchOS)
import WatchKit
#endif

/// Acil durum / SOS akışını yönetir.
///
/// ÖNEMLİ SINIRLAMA: Apple, üçüncü taraf uygulamalara doğrudan "uydu üzerinden mesajlaşma"
/// için genel bir API sunmuyor. iPhone 14 ve üzeri cihazlardaki "Acil SOS (Uydu)" özelliği
/// yalnızca işletim sisteminin kendi Acil Durum akışı (yan tuşa basılı tutma) üzerinden
/// çalışır ve üçüncü taraf uygulamalar tarafından tetiklenemez veya özelleştirilemez.
///
/// Bu yüzden burada gerçekçi ve gerçekten çalışan iki katman uyguluyoruz:
///  1) Hücresel/Wi-Fi bağlantısı VARSA: konum bilgisini SMS/iMessage ile kayıtlı acil
///     kişilere ve Sahil Güvenliği'ne (158) / 112'ye tek dokunuşla arama olarak gönderiyoruz.
///  2) Hücresel/Wi-Fi bağlantısı YOKSA (açık denizde tipik durum): kullanıcıyı cihazın
///     kendi "Acil SOS" / "Acil SOS (Uydu)" akışını başlatması için yönlendiriyor ve
///     bulunduğu son GPS konumunu ekranda büyük punto ile gösteriyor (kurtarma ekiplerine
///     sözlü olarak iletilebilmesi için).
final class AcilDurumYoneticisi: ObservableObject {
    static let shared = AcilDurumYoneticisi()

    private let anahtarKisiler = "acil_kisiler"

    @Published private(set) var kayitliKisiler: [AcilKisi] = []

    init() {
        kayitliKisiler = kisileriOku()
    }

    func kisiEkle(_ kisi: AcilKisi) {
        kayitliKisiler.append(kisi)
        kaydet()
    }

    func kisiSil(id: UUID) {
        kayitliKisiler.removeAll { $0.id == id }
        kaydet()
    }

    /// Sahil Güvenliği ve 112 her zaman listede hazır bulunur; kullanıcı ayrıca kendi
    /// yakınlarını (eş, aile, tekne kulübü vb.) ekleyebilir.
    var tumKisiler: [AcilKisi] {
        [AcilKisi.sahilGuvenligi, AcilKisi.genelAcilHat] + kayitliKisiler
    }

    private func kaydet() {
        guard let veri = try? JSONEncoder().encode(kayitliKisiler) else { return }
        UserDefaults.standard.set(veri, forKey: anahtarKisiler)
    }

    private func kisileriOku() -> [AcilKisi] {
        guard let veri = UserDefaults.standard.data(forKey: anahtarKisiler),
              let kisiler = try? JSONDecoder().decode([AcilKisi].self, from: veri) else { return [] }
        return kisiler
    }

    /// SOS için konum ve durum metnini hazırlar.
    func sosMetniOlustur(konum: CLLocation?, sporTuru: SporTuru?) -> String {
        var metin = "🆘 ACİL YARDIM İSTİYORUM."
        if let sporTuru {
            metin += " Aktivite: \(sporTuru.adi)."
        }
        if let konum {
            metin += " Konumum: \(konum.coordinate.latitude), \(konum.coordinate.longitude)"
            metin += " — https://maps.google.com/?q=\(konum.coordinate.latitude),\(konum.coordinate.longitude)"
        } else {
            metin += " Şu anda GPS konumu alınamıyor, son bilinen konum kullanılmalı."
        }
        return metin
    }

    #if os(iOS)
    /// Verilen numaraya doğrudan arama başlatır (Sahil Güvenliği / 112 dahil).
    func ara(numara: String) {
        let temiz = numara.replacingOccurrences(of: " ", with: "")
        guard let url = URL(string: "tel://\(temiz)"), UIApplication.shared.canOpenURL(url) else { return }
        UIApplication.shared.open(url)
    }
    #elseif os(watchOS)
    func ara(numara: String) {
        let temiz = numara.replacingOccurrences(of: " ", with: "")
        guard let url = URL(string: "tel://\(temiz)") else { return }
        WKExtension.shared().openSystemURL(url)
    }
    #endif
}
