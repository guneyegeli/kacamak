import SwiftUI

/// "Bir Bakışta" ana takip sayfası — STRATEGY.md §4.2.
/// 6 sabit veri her zaman görünür: Mesafe, Süre, Kalori, Nabız, Kürek hızı (veya Ort. Hız), Rüzgar.
/// Sadece Kürek karosu ve Rüzgar şeridi dokunmaya tepki verir; diğerleri ıslak elde yanlış
/// dokunmayı önlemek için tepkisizdir.
struct WatchBirBakistaView: View {
    @EnvironmentObject private var antrenmanYoneticisi: AntrenmanYoneticisi
    @ObservedObject private var kurekSayaci = AntrenmanYoneticisi.shared.kurekSayaci
    @ObservedObject private var ruzgarServisi = AntrenmanYoneticisi.shared.ruzgarServisi
    @Environment(\.isLuminanceReduced) private var luminanceAzaldi
    @State private var ruzgarDetayAcik = false

    private var oturum: RotaOturumu? { antrenmanYoneticisi.aktifOturum }
    private var kurekDestekleniyor: Bool { oturum?.sporTuru.kurekSayimiDestekleniyor ?? false }

    private var guncelRuzgar: RuzgarBilgisi? {
        ruzgarServisi.anlikRuzgar ?? antrenmanYoneticisi.anlikRuzgar
    }

    var body: some View {
        VStack(spacing: 6) {
            ustBaslik

            if let oturum {
                Text(Bicimlendirici.mesafeKm(oturum.toplamMesafeMetre))
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
            }

            HStack {
                MetrikKarosu(
                    baslik: "Nabız",
                    deger: antrenmanYoneticisi.anlikNabiz.map { String(format: "%.0f", $0) } ?? "—",
                    birim: "",
                    renk: .red,
                    simge: "heart.fill"
                )
                Spacer()
                MetrikKarosu(
                    baslik: "Kalori",
                    deger: Bicimlendirici.kalori(antrenmanYoneticisi.anlikKaloriKcal),
                    birim: "",
                    renk: .orange,
                    simge: "flame.fill"
                )
            }

            HStack {
                ikinciSatirSolKaro
                Spacer()
                MetrikKarosu(
                    baslik: "Anlık Hız",
                    deger: Bicimlendirici.hizKmS(antrenmanYoneticisi.anlikHizMS ?? 0),
                    birim: "",
                    renk: .green,
                    simge: "bolt.fill"
                )
            }

            if let guncelRuzgar {
                RuzgarSeridi(guncelRuzgar, dokun: {
                    ruzgarDetayAcik = true
                })
            }
        }
        .padding(.horizontal, 4)
        .background(
            NavigationLink(isActive: $ruzgarDetayAcik) {
                WatchRuzgarDetayView()
            } label: { EmptyView() }
            .hidden()
        )
    }

    private var ustBaslik: some View {
        HStack {
            if let oturum {
                Text(luminanceAzaldi ? Bicimlendirici.sureKisa(oturum.sureSaniye) : Bicimlendirici.sure(oturum.sureSaniye))
                    .font(.system(.title3, design: .monospaced))
                Spacer()
                Text("\(oturum.sporTuru.emoji) \(oturum.sporTuru.adi)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }

    /// Kürek sayımı destekleniyorsa Kürek Hızı (dokunulabilir → Kürek Detayı),
    /// desteklenmiyorsa yerine Ortalama Hız (dokunmaz).
    @ViewBuilder
    private var ikinciSatirSolKaro: some View {
        if kurekDestekleniyor {
            NavigationLink {
                WatchKurekDetayView()
            } label: {
                MetrikKarosu(
                    baslik: "Kürek Hızı",
                    deger: luminanceAzaldi ? "—" : Bicimlendirici.kurekHizi(kurekSayaci.kurekHiziDakika),
                    birim: "",
                    renk: .blue,
                    simge: "figure.paddlesports"
                )
            }
            .buttonStyle(.plain)
        } else {
            MetrikKarosu(
                baslik: "Ortalama Hız",
                deger: Bicimlendirici.hizKmS(oturum?.ortalamaHizMS ?? 0),
                birim: "",
                renk: .blue,
                simge: "speedometer"
            )
        }
    }
}

/// Ortak metrik karosu: simge + değer (+ birim), tek bir satır olarak.
private struct MetrikKarosu: View {
    let baslik: String
    let deger: String
    let birim: String
    let renk: Color
    let simge: String

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: simge)
                .foregroundStyle(renk)
                .imageScale(.small)
            Text(deger)
                .font(.system(.callout, design: .rounded).bold())
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if !birim.isEmpty {
                Text(birim)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(baslik): \(deger) \(birim)")
    }
}

private extension Bicimlendirici {
    /// Always-On modda saniye hanesi gizli süre gösterimi ("12:34" yerine "12" dk gibi kaba gösterim).
    static func sureKisa(_ saniye: TimeInterval) -> String {
        let toplamSaniye = Int(saniye.rounded(.down))
        let saat = toplamSaniye / 3600
        let dakika = (toplamSaniye % 3600) / 60
        if saat > 0 {
            return String(format: "%d:%02d", saat, dakika)
        }
        return String(format: "%d dk", dakika)
    }
}
