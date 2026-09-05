import SwiftUI
import CoreLocation

struct WatchAcilDurumView: View {
    @EnvironmentObject private var acilDurumYoneticisi: AcilDurumYoneticisi
    @EnvironmentObject private var antrenmanYoneticisi: AntrenmanYoneticisi
    @EnvironmentObject private var koprusu: BaglantiKoprusu
    @State private var konum: CLLocation?
    @State private var sosGonderildi = false

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("Sinyal yoksa yan düğmeyi basılı tutup iOS'un Acil SOS (Uydu) özelliğini kullan.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button {
                    sosGonder()
                } label: {
                    Label(sosGonderildi ? "Gönderildi" : "SOS Gönder", systemImage: "exclamationmark.triangle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .tint(.red)
                .buttonStyle(.borderedProminent)

                Button {
                    acilDurumYoneticisi.ara(numara: AcilKisi.sahilGuvenligi.telefonNumarasi)
                } label: {
                    Label("Sahil Güvenliği (158)", systemImage: "phone.fill")
                }

                Button {
                    acilDurumYoneticisi.ara(numara: AcilKisi.genelAcilHat.telefonNumarasi)
                } label: {
                    Label("112 Acil Çağrı", systemImage: "phone.fill")
                }

                if let konum {
                    Text("\(konum.coordinate.latitude, specifier: "%.4f"), \(konum.coordinate.longitude, specifier: "%.4f")")
                        .font(.system(.caption2, design: .monospaced))
                }
            }
            .padding(.horizontal, 4)
        }
        .onAppear {
            antrenmanYoneticisi.acilDurumIcinKonumAl { konum = $0 }
        }
    }

    private func sosGonder() {
        // iPhone menzildeyse anında haber verir; telefonda konumla birlikte
        // yakınlara ve Sahil Güvenliği'ne bilgi akışı iPhone tarafında tetiklenir.
        koprusu.sosGonder()
        sosGonderildi = true
    }
}
