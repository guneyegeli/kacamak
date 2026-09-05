import SwiftUI

/// `yonOkuDerece`'ye göre döndürülmüş bir rüzgar oku (SF Symbol `arrow.up`).
/// Ok, rüzgarın estiği yönü değil AKTIĞI (hareket) yönü gösterir — Windy ok konvansiyonu.
/// Renk çağıran tarafça verilir (ör. `RuzgarGuvenlikBandi`'ye göre yeşil/sarı/kırmızı).
/// iPhone harita overlay'i ve Watch "Bir Bakışta"/"Rüzgar Şeridi" tarafından ortak kullanılır.
struct RuzgarOku: View {
    var yonOkuDerece: Double
    var renk: Color
    var boyut: CGFloat

    init(yonOkuDerece: Double, renk: Color = .primary, boyut: CGFloat = 20) {
        self.yonOkuDerece = yonOkuDerece
        self.renk = renk
        self.boyut = boyut
    }

    /// `RuzgarBilgisi`'nden kısayol; okun açısı `bilgi.yonOkuDerece`'den alınır.
    init(_ bilgi: RuzgarBilgisi, renk: Color = .primary, boyut: CGFloat = 20) {
        self.init(yonOkuDerece: bilgi.yonOkuDerece, renk: renk, boyut: boyut)
    }

    var body: some View {
        Image(systemName: "arrow.up")
            .font(.system(size: boyut, weight: .bold))
            .foregroundStyle(renk)
            .rotationEffect(.degrees(yonOkuDerece))
            .accessibilityLabel(Text("Rüzgar yönü"))
    }
}

#Preview {
    HStack(spacing: 16) {
        RuzgarOku(yonOkuDerece: 0, renk: .green)
        RuzgarOku(yonOkuDerece: 90, renk: .yellow)
        RuzgarOku(yonOkuDerece: 225, renk: .red, boyut: 28)
    }
    .padding()
}
