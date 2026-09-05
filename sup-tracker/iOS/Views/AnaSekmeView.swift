import SwiftUI

struct AnaSekmeView: View {
    var body: some View {
        TabView {
            RotaTakipView()
                .tabItem { Label("Takip", systemImage: "location.fill") }

            GecmisListesiView()
                .tabItem { Label("Geçmiş", systemImage: "clock.arrow.circlepath") }

            AcilDurumView()
                .tabItem { Label("Acil Durum", systemImage: "exclamationmark.triangle.fill") }

            AyarlarView()
                .tabItem { Label("Ayarlar", systemImage: "gearshape.fill") }
        }
        .tint(.orange)
    }
}
