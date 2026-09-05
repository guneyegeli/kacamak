import SwiftUI

/// Dikey TabView'ın en üst sayfası: Duraklat/Devam/Bitir + Acil Durum'a kısayol.
/// STRATEGY.md §4.1, §4.4.
struct WatchKontrolSayfasi: View {
    @EnvironmentObject private var antrenmanYoneticisi: AntrenmanYoneticisi
    let bitince: () -> Void

    var body: some View {
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
                    bitince()
                }
            } label: {
                Label("Bitir", systemImage: "stop.fill")
            }

            NavigationLink {
                WatchAcilDurumView()
            } label: {
                Label("Acil Durum", systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
            }
        }
    }
}
