import SwiftUI
import MapKit

struct OturumOzetiView: View {
    let oturum: RotaOturumu
    @State private var stravaYukleniyor = false
    @State private var stravaSonucu: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if oturum.noktalar.count > 1 {
                        Map {
                            MapPolyline(coordinates: oturum.noktalar.map(\.koordinat))
                                .stroke(.orange, lineWidth: 4)
                        }
                        .frame(height: 220)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Text("\(oturum.sporTuru.emoji) \(oturum.sporTuru.adi)")
                        .font(.title2.bold())

                    ozetSatiri("Mesafe", String(format: "%.2f km", oturum.toplamMesafeMetre / 1000))
                    ozetSatiri("Süre", DateComponentsFormatter.sup.string(from: oturum.sureSaniye) ?? "-")
                    ozetSatiri("Ortalama Hız", String(format: "%.1f km/s", oturum.ortalamaHizMS * 3.6))
                    ozetSatiri("Maksimum Hız", String(format: "%.1f km/s", oturum.maksimumHizMS * 3.6))
                    if let kalori = oturum.aktifKaloriKcal {
                        ozetSatiri("Aktif Kalori", String(format: "%.0f kcal", kalori))
                    }
                    ozetSatiri("Kaydeden Cihaz", oturum.kaydedenCihaz)

                    Divider()

                    Label("Apple Sağlık'a kaydedildi", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(.green)

                    Button {
                        stravaYukle()
                    } label: {
                        if stravaYukleniyor {
                            ProgressView()
                        } else {
                            Label("Strava'ya Gönder", systemImage: "arrow.up.circle.fill")
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .disabled(stravaYukleniyor)

                    if let stravaSonucu {
                        Text(stravaSonucu).font(.footnote).foregroundStyle(.secondary)
                    }
                }
                .padding()
            }
            .navigationTitle("Oturum Özeti")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Kapat") { dismiss() }
                }
            }
        }
    }

    private func ozetSatiri(_ baslik: String, _ deger: String) -> some View {
        HStack {
            Text(baslik).foregroundStyle(.secondary)
            Spacer()
            Text(deger).bold()
        }
    }

    private func stravaYukle() {
        stravaYukleniyor = true
        StravaServisi.shared.aktiviteYukle(oturum) { sonuc in
            stravaYukleniyor = false
            switch sonuc {
            case .success:
                stravaSonucu = "Strava'ya gönderildi. İşlenmesi birkaç dakika sürebilir."
            case .failure(let hata):
                stravaSonucu = "Gönderilemedi: \(hata.localizedDescription)"
            }
        }
    }
}

extension DateComponentsFormatter {
    static let sup: DateComponentsFormatter = {
        let f = DateComponentsFormatter()
        f.allowedUnits = [.hour, .minute, .second]
        f.unitsStyle = .positional
        f.zeroFormattingBehavior = .pad
        return f
    }()
}
