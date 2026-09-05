import SwiftUI

struct WatchTakipView: View {
    @EnvironmentObject private var antrenmanYoneticisi: AntrenmanYoneticisi
    @Environment(\.dismiss) private var dismiss
    @State private var ozetGosteriliyor = false

    var body: some View {
        TabView {
            metrikSayfasi
            kontrolSayfasi
        }
        .tabViewStyle(.page)
        .navigationBarBackButtonHidden(true)
        .sheet(isPresented: $ozetGosteriliyor) {
            WatchOzetView(kapat: { dismiss() })
        }
    }

    private var metrikSayfasi: some View {
        VStack(spacing: 6) {
            if let oturum = antrenmanYoneticisi.aktifOturum {
                Text(String(format: "%.2f km", oturum.toplamMesafeMetre / 1000))
                    .font(.system(size: 28, weight: .bold))
                Text(sureFormatla(oturum.sureSaniye))
                    .font(.title3)
                    .foregroundStyle(.secondary)
                HStack {
                    Label(String(format: "%.1f km/s", oturum.ortalamaHizMS * 3.6), systemImage: "speedometer")
                    if let nabiz = antrenmanYoneticisi.anlikNabiz {
                        Label(String(format: "%.0f", nabiz), systemImage: "heart.fill")
                    }
                }
                .font(.caption)
            }
        }
    }

    private var kontrolSayfasi: some View {
        VStack(spacing: 8) {
            if antrenmanYoneticisi.izlemeDurumu == .aktif {
                Button {
                    antrenmanYoneticisi.duraklat()
                } label: {
                    Label("Duraklat", systemImage: "pause.fill")
                }
                .tint(.yellow)
            } else {
                Button {
                    antrenmanYoneticisi.devamEt()
                } label: {
                    Label("Devam Et", systemImage: "play.fill")
                }
                .tint(.orange)
            }

            Button(role: .destructive) {
                antrenmanYoneticisi.bitir { _ in
                    ozetGosteriliyor = true
                }
            } label: {
                Label("Bitir", systemImage: "stop.fill")
            }
        }
    }

    private func sureFormatla(_ saniye: TimeInterval) -> String {
        let dakika = Int(saniye) / 60
        let saniyeKalan = Int(saniye) % 60
        return String(format: "%d:%02d", dakika, saniyeKalan)
    }
}
