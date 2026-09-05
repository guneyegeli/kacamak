import SwiftUI
import MapKit

struct OturumDetayView: View {
    let oturum: RotaOturumu
    @State private var stravaYukleniyor = false
    @State private var stravaSonucu: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if oturum.noktalar.count > 1 {
                    Map {
                        MapPolyline(coordinates: oturum.noktalar.map(\.koordinat))
                            .stroke(.orange, lineWidth: 4)
                    }
                    .frame(height: 260)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Text("\(oturum.sporTuru.emoji) \(oturum.sporTuru.adi)")
                    .font(.title2.bold())

                Text(oturum.baslangicZamani.formatted(date: .long, time: .shortened))
                    .foregroundStyle(.secondary)

                Grid(alignment: .leading, horizontalSpacing: 24, verticalSpacing: 8) {
                    GridRow {
                        Text("Mesafe"); Text(String(format: "%.2f km", oturum.toplamMesafeMetre / 1000)).bold()
                    }
                    GridRow {
                        Text("Süre"); Text(DateComponentsFormatter.sup.string(from: oturum.sureSaniye) ?? "-").bold()
                    }
                    GridRow {
                        Text("Ortalama Hız"); Text(String(format: "%.1f km/s", oturum.ortalamaHizMS * 3.6)).bold()
                    }
                    GridRow {
                        Text("Maksimum Hız"); Text(String(format: "%.1f km/s", oturum.maksimumHizMS * 3.6)).bold()
                    }
                    if oturum.kurekSayisi > 0 {
                        GridRow {
                            Text("Kürek").font(.headline).gridCellColumns(2)
                        }
                        GridRow {
                            Text("Toplam Kürek"); Text("\(oturum.kurekSayisi)").bold()
                        }
                        if let ortalama = oturum.ortalamaKurekHizi {
                            GridRow {
                                Text("Ort. Kürek Hızı"); Text(String(format: "%.0f/dk", ortalama)).bold()
                            }
                        }
                        if let maksimum = oturum.maksimumKurekHizi {
                            GridRow {
                                Text("Maks. Kürek Hızı"); Text(String(format: "%.0f/dk", maksimum)).bold()
                            }
                        }
                        if let verimlilik = oturum.kurekVerimlilikMetreBasi {
                            GridRow {
                                Text("Kürek Başına Mesafe"); Text(String(format: "%.1f m", verimlilik)).bold()
                            }
                        }
                    }
                    if let ruzgarOzeti = oturum.ruzgarOzeti {
                        GridRow {
                            Text("Koşullar").font(.headline).gridCellColumns(2)
                        }
                        GridRow {
                            Text("Rüzgar"); Text(ruzgarOzeti).bold()
                        }
                        if let gust = oturum.maksimumGustMS {
                            GridRow {
                                Text("Maksimum Gust"); Text(String(format: "%.0f kn", gust * 1.943844)).bold()
                            }
                        }
                    }
                }
                .font(.subheadline)

                Button {
                    stravaYukle()
                } label: {
                    if stravaYukleniyor {
                        ProgressView()
                    } else {
                        Label(oturum.stravaAktiviteId == nil ? "Strava'ya Gönder" : "Strava'ya Tekrar Gönder", systemImage: "arrow.up.circle.fill")
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)

                if let stravaSonucu {
                    Text(stravaSonucu).font(.footnote).foregroundStyle(.secondary)
                }
            }
            .padding()
        }
        .navigationTitle("Oturum Detayı")
    }

    private func stravaYukle() {
        stravaYukleniyor = true
        StravaServisi.shared.aktiviteYukle(oturum) { sonuc in
            stravaYukleniyor = false
            switch sonuc {
            case .success:
                stravaSonucu = "Strava'ya gönderildi."
            case .failure(let hata):
                stravaSonucu = "Gönderilemedi: \(hata.localizedDescription)"
            }
        }
    }
}
