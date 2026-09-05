import SwiftUI
import AuthenticationServices

struct AyarlarView: View {
    @StateObject private var stravaServisi = StravaServisi.shared
    @EnvironmentObject private var koprusu: BaglantiKoprusu
    @State private var sunanPencere = SunumBaglami()
    @AppStorage("ruzgarBirimi") private var ruzgarBirimi = "knot"

    var body: some View {
        NavigationStack {
            Form {
                Section("Rüzgar") {
                    Text("Rüzgar tahmini Open-Meteo.com'dan alınır.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Picker("Hız Birimi", selection: $ruzgarBirimi) {
                        Text("Knot").tag("knot")
                        Text("km/s").tag("kmh")
                    }
                    .pickerStyle(.segmented)
                    Text("Rüzgar verisi: Open-Meteo.com (CC BY 4.0)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Strava") {
                    if stravaServisi.baglıMi {
                        Label("Strava'ya bağlı", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Button("Bağlantıyı Kes", role: .destructive) {
                            stravaServisi.baglantiyiKes()
                        }
                    } else {
                        Button("Strava ile Bağlan") {
                            stravaServisi.girisYap(sunanPencere: sunanPencere) { _ in }
                        }
                    }
                }

                Section("Apple Watch") {
                    Label(
                        koprusu.karsiCihazUlasilabilir ? "Apple Watch bağlı" : "Apple Watch bulunamadı",
                        systemImage: koprusu.karsiCihazUlasilabilir ? "applewatch.radiowaves.left.and.right" : "applewatch.slash"
                    )
                    .foregroundStyle(koprusu.karsiCihazUlasilabilir ? .green : .secondary)
                    Text("Watch uygulamasını açıp bir oturum başlattığında rota canlı olarak buraya senkronize edilir.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Apple Sağlık") {
                    Text("Tamamlanan her oturum otomatik olarak Sağlık uygulamasına antrenman ve rota (GPS) olarak kaydedilir.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Hakkında") {
                    LabeledContent("Uygulama", value: "Kaçamak SUP Takip")
                    Text("SUP, kano, kürek, yelken, açık su yüzme, kite sörf ve sörf için GPS rota kaydı; Strava ve Apple Sağlık entegrasyonu; acil durumda Sahil Güvenliği'ne (158) ve 112'ye hızlı erişim.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Ayarlar")
        }
    }
}

private class SunumBaglami: NSObject, ASWebAuthenticationPresentationContextProviding, ObservableObject {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        ASPresentationAnchor()
    }
}
