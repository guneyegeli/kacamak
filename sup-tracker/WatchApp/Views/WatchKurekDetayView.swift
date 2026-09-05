import SwiftUI
import Charts

/// Kürek Detayı sayfası — STRATEGY.md §4.3.
struct WatchKurekDetayView: View {
    @ObservedObject private var kurekSayaci = AntrenmanYoneticisi.shared.kurekSayaci

    private var renk: Color {
        switch kurekSayaci.kurekHiziDakika {
        case ..<35: return .gray
        case 35..<50: return .green
        case 50..<65: return .yellow
        default: return .orange
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Kürek/dk")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(Bicimlendirici.kurekHizi(kurekSayaci.kurekHiziDakika))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(renk)
                }

                Divider()

                satir(baslik: "Toplam", deger: "\(kurekSayaci.kurekSayisi)")

                HStack {
                    satir(baslik: "Ort.", deger: kurekSayaci.ortalamaKurekHizi.map { Bicimlendirici.kurekHizi($0) } ?? "—")
                    Spacer()
                    satir(baslik: "Maks", deger: kurekSayaci.maksimumKurekHizi.map { Bicimlendirici.kurekHizi($0) } ?? "—")
                }

                satir(
                    baslik: "Mesafe/kürek",
                    deger: kurekSayaci.kurekBasinaMesafeMetre.map { String(format: "%.1f m", $0) } ?? "—"
                )

                if let endeks = kurekSayaci.kurekGucuEndeksi {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Efor endeksi")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        HStack(spacing: 4) {
                            eforCubugu(endeks)
                            Text("\(Int(endeks.rounded()))")
                                .font(.caption.monospacedDigit())
                        }
                    }
                }

                if !kurekSayaci.son60SaniyeHizlari.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Son 60 sn")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Chart {
                            ForEach(Array(kurekSayaci.son60SaniyeHizlari.enumerated()), id: \.offset) { index, hiz in
                                BarMark(
                                    x: .value("Kova", index),
                                    y: .value("Kürek/dk", hiz)
                                )
                                .foregroundStyle(.blue)
                            }
                        }
                        .chartXAxis(.hidden)
                        .chartYAxis(.hidden)
                        .frame(height: 40)
                    }
                }
            }
            .padding(.horizontal, 4)
        }
    }

    private func satir(baslik: String, deger: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(baslik)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(deger)
                .font(.body.monospacedDigit())
        }
    }

    private func eforCubugu(_ endeks: Double) -> some View {
        let doluBlok = min(8, max(0, Int((endeks / 100 * 8).rounded())))
        let metin = String(repeating: "▮", count: doluBlok) + String(repeating: "▯", count: 8 - doluBlok)
        return Text(metin)
            .font(.caption)
            .foregroundStyle(.orange)
    }
}
