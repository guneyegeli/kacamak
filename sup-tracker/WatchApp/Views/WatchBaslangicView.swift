import SwiftUI

struct WatchBaslangicView: View {
    @EnvironmentObject private var antrenmanYoneticisi: AntrenmanYoneticisi
    @State private var seciliSpor: SporTuru = .sup
    @State private var takipEkraniAktif = false

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("Kaçamak SUP").font(.headline)

                Picker("Spor", selection: $seciliSpor) {
                    ForEach(SporTuru.allCases) { spor in
                        Text("\(spor.emoji) \(spor.adi)").tag(spor)
                    }
                }
                .pickerStyle(.wheel)
                .frame(height: 80)

                Button {
                    antrenmanYoneticisi.basla(sporTuru: seciliSpor)
                    takipEkraniAktif = true
                } label: {
                    Label("Başlat", systemImage: "play.fill")
                        .frame(maxWidth: .infinity)
                }
                .tint(.orange)

                NavigationLink(isActive: $takipEkraniAktif) {
                    WatchTakipView()
                } label: { EmptyView() }
                .hidden()

                NavigationLink {
                    WatchAcilDurumView()
                } label: {
                    Label("Acil Durum", systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                }
            }
            .padding(.horizontal, 4)
        }
    }
}
