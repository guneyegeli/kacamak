import SwiftUI

/// STRATEGY.md §4.2 "RÜZGAR ŞERİDİ": ok + knot hız + gust + pusula kısaltması,
/// arka plan rengi güvenlik bandına göre (yeşil/sarı/kırmızı). "Bir Bakışta" sayfasında
/// ve Başlangıç ekranındaki oturum-öncesi önizlemede ortak kullanılır.
///
/// Navigasyonu kendi kurmaz: `dokun` verilirse (ör. Rüzgar Detayı'na geçiş) sadece çağırır.
struct RuzgarSeridi: View {
    var ruzgar: RuzgarBilgisi
    var sporTuru: SporTuru
    var dokun: (() -> Void)?

    init(ruzgar: RuzgarBilgisi, sporTuru: SporTuru, dokun: (() -> Void)? = nil) {
        self.ruzgar = ruzgar
        self.sporTuru = sporTuru
        self.dokun = dokun
    }

    private var guvenlikBandi: RuzgarGuvenlikBandi {
        ruzgar.guvenlikBandi(sporTuru: sporTuru)
    }

    private var arkaPlanRengi: Color {
        switch guvenlikBandi {
        case .sakin: return .green
        case .dikkat: return .yellow
        case .tehlikeli: return .red
        }
    }

    /// Sarı zeminde beyaz metin kontrastı zayıf kaldığından o bantta koyu metin kullanılır.
    private var metinRengi: Color {
        guvenlikBandi == .dikkat ? .black : .white
    }

    private var dakikaOnce: Int {
        max(0, Int(Date().timeIntervalSince(ruzgar.alinmaZamani) / 60))
    }

    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 6) {
                RuzgarOku(ruzgar, renk: metinRengi, boyut: 15)

                Text("\(Int(ruzgar.hizKnot.rounded())) kn")
                    .font(.system(.body, design: .rounded, weight: .semibold))
                    .lineLimit(1)

                if let gustKnot = ruzgar.gustKnot {
                    Text("gust \(Int(gustKnot.rounded()))")
                        .font(.system(.caption2, design: .rounded))
                        .lineLimit(1)
                }

                Spacer(minLength: 2)

                Circle()
                    .fill(metinRengi.opacity(0.7))
                    .frame(width: 4, height: 4)

                Text(ruzgar.yonKisaltma)
                    .font(.system(.body, design: .rounded, weight: .semibold))
            }
            .foregroundStyle(metinRengi)

            if ruzgar.eskiMi {
                Text("⚠︎ \(dakikaOnce) dk önce")
                    .font(.system(size: 9))
                    .foregroundStyle(metinRengi.opacity(0.85))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .frame(maxWidth: .infinity)
        .background(arkaPlanRengi.opacity(0.85), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .onTapGesture { dokun?() }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text("Rüzgar \(ruzgar.yonKisaltma) yönünden \(Int(ruzgar.hizKnot.rounded())) knot"))
    }
}

#Preview {
    VStack(spacing: 8) {
        RuzgarSeridi(
            ruzgar: RuzgarBilgisi(hizMS: 4, yonDerece: 45, gustMS: 5.5, zaman: Date(), kaynak: .openMeteo),
            sporTuru: .sup
        )
        RuzgarSeridi(
            ruzgar: RuzgarBilgisi(hizMS: 8, yonDerece: 135, gustMS: 9.5, zaman: Date(), kaynak: .openMeteo),
            sporTuru: .sup
        )
        RuzgarSeridi(
            ruzgar: RuzgarBilgisi(
                hizMS: 11, yonDerece: 225, gustMS: 13,
                zaman: Date(), alinmaZamani: Date().addingTimeInterval(-50 * 60), kaynak: .openMeteo
            ),
            sporTuru: .sup
        )
    }
    .padding()
}
