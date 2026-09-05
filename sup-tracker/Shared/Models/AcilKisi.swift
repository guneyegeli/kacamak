import Foundation

/// Acil durumda konum ve haber gönderilecek kişi ya da kurum.
struct AcilKisi: Codable, Identifiable, Equatable {
    let id: UUID
    var isim: String
    var telefonNumarasi: String
    var iliski: String       // "Eş", "Aile", "Sahil Güvenliği" vb.
    var resmiKurumMu: Bool   // true ise Sahil Güvenliği / 112 gibi bir hat

    init(id: UUID = UUID(), isim: String, telefonNumarasi: String, iliski: String, resmiKurumMu: Bool = false) {
        self.id = id
        self.isim = isim
        self.telefonNumarasi = telefonNumarasi
        self.iliski = iliski
        self.resmiKurumMu = resmiKurumMu
    }

    /// Türkiye'de Sahil Güvenlik Komutanlığı'nın acil ihbar hattı: 158.
    /// Deniz kazası, kaybolma veya yardım ihtiyacında bu numara aranır/mesaj atılır.
    static let sahilGuvenligi = AcilKisi(
        isim: "Sahil Güvenliği",
        telefonNumarasi: "158",
        iliski: "Resmi Arama-Kurtarma",
        resmiKurumMu: true
    )

    /// Genel acil çağrı hattı (AFAD/112).
    static let genelAcilHat = AcilKisi(
        isim: "112 Acil Çağrı Merkezi",
        telefonNumarasi: "112",
        iliski: "Resmi Arama-Kurtarma",
        resmiKurumMu: true
    )
}
