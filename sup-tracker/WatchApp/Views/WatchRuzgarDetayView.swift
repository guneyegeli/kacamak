import SwiftUI

/// Rüzgar Detayı sayfası — STRATEGY.md §4.3. Oturum içinde ve dışında (WatchBaslangicView'dan
/// planlama amaçlı) açılabilir. Crown ile kaydırılabilir ScrollView.
struct WatchRuzgarDetayView: View {
    @ObservedObject private var ruzgarServisi = AntrenmanYoneticisi.shared.ruzgarServisi

    private var takvim: Calendar { Calendar.current }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                if let tahminSeti = ruzgarServisi.tahminSeti {
                    simdiSatiri(tahminSeti.anlik ?? ruzgarServisi.anlikRuzgar)

                    if !tahminSeti.yaklasanSaatler(3).isEmpty {
                        Divider()
                        saatlikSerit(tahminSeti)
                    }

                    if !tahminSeti.gunluk.isEmpty {
                        Divider()
                        gunlukOzet(tahminSeti)
                    }
                } else if let anlik = ruzgarServisi.anlikRuzgar {
                    simdiSatiri(anlik)
                    Text("Tahmin yükleniyor…")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                } else if ruzgarServisi.yukleniyor {
                    ProgressView("Yükleniyor…")
                } else {
                    Text("Rüzgar verisi yok")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Divider()
                Text("Rüzgar verisi: Open-Meteo.com (CC BY 4.0)")
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 4)
        }
    }

    @ViewBuilder
    private func simdiSatiri(_ ruzgar: RuzgarBilgisi?) -> some View {
        if let ruzgar {
            VStack(alignment: .leading, spacing: 2) {
                Text("Şimdi")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                HStack(spacing: 4) {
                    Image(systemName: "arrow.up")
                        .rotationEffect(.degrees(ruzgar.yonOkuDerece))
                    Text(Bicimlendirici.ruzgarKnot(ruzgar.hizMS))
                        .font(.title3.bold())
                    Text("(\(ruzgar.yonKisaltma), \(Int(ruzgar.yonDerece.rounded()))°)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                if let gustKnot = ruzgar.gustKnot {
                    Text("gust \(Int(gustKnot.rounded())) kn")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
                if ruzgar.eskiMi {
                    Text("⚠︎ eski veri")
                        .font(.caption2)
                        .foregroundStyle(.yellow)
                }
            }
        } else {
            Text("Şimdi: veri yok")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func saatlikSerit(_ tahminSeti: RuzgarTahminSeti) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Yaklaşan saatler")
                .font(.caption2)
                .foregroundStyle(.secondary)
            HStack(spacing: 10) {
                ForEach(tahminSeti.yaklasanSaatler(3)) { saat in
                    VStack(spacing: 2) {
                        Text(saatEtiketi(saat.zaman))
                            .font(.caption2)
                        Image(systemName: "arrow.up")
                            .rotationEffect(.degrees(saat.ruzgarBilgisi.yonOkuDerece))
                            .imageScale(.small)
                        Text("\(Int(saat.hizKnot.rounded()))")
                            .font(.caption.bold())
                    }
                }
            }
        }
    }

    private func gunlukOzet(_ tahminSeti: RuzgarTahminSeti) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(tahminSeti.gunluk) { gun in
                HStack {
                    Text(gunEtiketi(gun.gun))
                        .font(.caption)
                        .frame(width: 40, alignment: .leading)
                    Text("maks \(Int(gun.maksimumHizKnot.rounded())) kn")
                        .font(.caption2)
                    if let gustKnot = gun.maksimumGustKnot {
                        Text("gust \(Int(gustKnot.rounded()))")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                    Spacer()
                    Text(gun.baskinYonKisaltma)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func saatEtiketi(_ zaman: Date) -> String {
        let fark = zaman.timeIntervalSinceNow
        let saat = Int((fark / 3600).rounded())
        return saat <= 0 ? "şimdi" : "+\(saat)s"
    }

    private func gunEtiketi(_ gun: Date) -> String {
        if takvim.isDateInToday(gun) { return "Bugün" }
        if takvim.isDateInTomorrow(gun) { return "Yarın" }
        let formatlayici = DateFormatter()
        formatlayici.locale = Locale(identifier: "tr_TR")
        formatlayici.setLocalizedDateFormatFromTemplate("EEEE")
        return formatlayici.string(from: gun)
    }
}
