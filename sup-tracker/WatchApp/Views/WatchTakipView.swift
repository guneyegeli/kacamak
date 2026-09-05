import SwiftUI

/// Dikey sayfalı takip konteyneri — STRATEGY.md §4.1, §4.4.
/// Digital Crown ile sayfalar arası geçiş (Apple Workout deseniyle aynı alışkanlık).
struct WatchTakipView: View {
    @EnvironmentObject private var antrenmanYoneticisi: AntrenmanYoneticisi
    @Environment(\.dismiss) private var dismiss
    @State private var seciliSayfa = 1
    @State private var ozetGosteriliyor = false

    private var kurekDestekleniyor: Bool {
        antrenmanYoneticisi.aktifOturum?.sporTuru.kurekSayimiDestekleniyor ?? false
    }

    var body: some View {
        TabView(selection: $seciliSayfa) {
            WatchKontrolSayfasi(bitince: { ozetGosteriliyor = true })
                .tag(0)

            WatchBirBakistaView()
                .tag(1)

            if kurekDestekleniyor {
                WatchKurekDetayView()
                    .tag(2)
            }

            WatchRuzgarDetayView()
                .tag(3)
        }
        .tabViewStyle(.verticalPage)
        .navigationBarBackButtonHidden(true)
        .sheet(isPresented: $ozetGosteriliyor) {
            WatchOzetView(kapat: { dismiss() })
        }
    }
}
