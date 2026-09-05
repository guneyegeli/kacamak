import SwiftUI
import MapKit

struct RotaTakipView: View {
    @EnvironmentObject private var antrenmanYoneticisi: AntrenmanYoneticisi
    @State private var seciliSpor: SporTuru = .sup
    @State private var kameraPozisyonu: MapCameraPosition = .automatic
    @State private var gosterilecekOzet: RotaOturumu?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Map(position: $kameraPozisyonu) {
                    if let oturum = antrenmanYoneticisi.aktifOturum, oturum.noktalar.count > 1 {
                        MapPolyline(coordinates: oturum.noktalar.map(\.koordinat))
                            .stroke(.orange, lineWidth: 4)
                    }
                    if let sonNokta = antrenmanYoneticisi.aktifOturum?.noktalar.last {
                        Marker("Konum", coordinate: sonNokta.koordinat)
                    }
                }
                .frame(height: 320)

                istatistikPaneli
                    .padding()

                Spacer()

                kontrolButonlari
                    .padding(.bottom, 24)
            }
            .navigationTitle("Rota Takibi")
            .sheet(item: $gosterilecekOzet) { oturum in
                OturumOzetiView(oturum: oturum)
            }
        }
    }

    private var istatistikPaneli: some View {
        HStack {
            if antrenmanYoneticisi.izlemeDurumu == .durduruldu {
                Picker("Spor Türü", selection: $seciliSpor) {
                    ForEach(SporTuru.allCases) { spor in
                        Text("\(spor.emoji) \(spor.adi)").tag(spor)
                    }
                }
                .pickerStyle(.menu)
            } else if let oturum = antrenmanYoneticisi.aktifOturum {
                istatistikGrid(oturum)
            }
        }
    }

    private func istatistikGrid(_ oturum: RotaOturumu) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            istatistikKart("Mesafe", String(format: "%.2f km", oturum.toplamMesafeMetre / 1000))
            istatistikKart("Süre", sureFormatla(oturum.sureSaniye))
            istatistikKart("Ort. Hız", String(format: "%.1f km/s", oturum.ortalamaHizMS * 3.6))
            istatistikKart("Maks. Hız", String(format: "%.1f km/s", oturum.maksimumHizMS * 3.6))
        }
    }

    private func istatistikKart(_ baslik: String, _ deger: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(baslik).font(.caption).foregroundStyle(.secondary)
            Text(deger).font(.title3).bold()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 10))
    }

    private var kontrolButonlari: some View {
        HStack(spacing: 20) {
            switch antrenmanYoneticisi.izlemeDurumu {
            case .durduruldu:
                Button {
                    antrenmanYoneticisi.basla(sporTuru: seciliSpor)
                } label: {
                    Label("Başlat", systemImage: "play.fill")
                        .font(.title3.bold())
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.orange, in: Capsule())
                        .foregroundStyle(.white)
                }
            case .aktif:
                Button {
                    antrenmanYoneticisi.duraklat()
                } label: {
                    Label("Duraklat", systemImage: "pause.fill")
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(.yellow, in: Capsule())
                }
                Button(role: .destructive) {
                    antrenmanYoneticisi.bitir { oturum in
                        gosterilecekOzet = oturum
                    }
                } label: {
                    Label("Bitir", systemImage: "stop.fill")
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(.red, in: Capsule())
                        .foregroundStyle(.white)
                }
            case .duraklatildi:
                Button {
                    antrenmanYoneticisi.devamEt()
                } label: {
                    Label("Devam Et", systemImage: "play.fill")
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.orange, in: Capsule())
                        .foregroundStyle(.white)
                }
                Button(role: .destructive) {
                    antrenmanYoneticisi.bitir { oturum in
                        gosterilecekOzet = oturum
                    }
                } label: {
                    Label("Bitir", systemImage: "stop.fill")
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(.red, in: Capsule())
                        .foregroundStyle(.white)
                }
            }
        }
        .padding(.horizontal)
    }

    private func sureFormatla(_ saniye: TimeInterval) -> String {
        let dakika = Int(saniye) / 60
        let saniyeKalan = Int(saniye) % 60
        let saat = dakika / 60
        if saat > 0 {
            return String(format: "%d:%02d:%02d", saat, dakika % 60, saniyeKalan)
        }
        return String(format: "%d:%02d", dakika, saniyeKalan)
    }
}
