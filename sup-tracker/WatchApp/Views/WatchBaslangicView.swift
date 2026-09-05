import SwiftUI

struct WatchBaslangicView: View {
    @EnvironmentObject private var antrenmanYoneticisi: AntrenmanYoneticisi
    @ObservedObject private var ruzgarServisi = AntrenmanYoneticisi.shared.ruzgarServisi
    @State private var seciliSpor: SporTuru = .sup
    @State private var takipEkraniAktif = false
    @State private var ruzgarDetayAcik = false

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("Kaçamak SUP").font(.headline)

                ruzgarOnizlemeSatiri

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
        .background(
            NavigationLink(isActive: $ruzgarDetayAcik) {
                WatchRuzgarDetayView()
            } label: { EmptyView() }
            .hidden()
        )
        .onAppear {
            // Doğrudan KonumYoneticisi'ne erişimimiz yok; AntrenmanYoneticisi'nin acil durum
            // için de kullandığı ortak konum kısayolunu kullanıyoruz. Konum yoksa sessizce geçilir.
            antrenmanYoneticisi.acilDurumIcinKonumAl { konum in
                guard let konum else { return }
                ruzgarServisi.guncelle(konum: konum) { _ in }
            }
        }
    }

    @ViewBuilder
    private var ruzgarOnizlemeSatiri: some View {
        if let ruzgar = ruzgarServisi.anlikRuzgar {
            RuzgarSeridi(ruzgar: ruzgar, sporTuru: seciliSpor, dokun: {
                ruzgarDetayAcik = true
            })
        } else if ruzgarServisi.yukleniyor {
            Text("Rüzgar yükleniyor…")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}
