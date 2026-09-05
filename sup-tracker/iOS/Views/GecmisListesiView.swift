import SwiftUI

struct GecmisListesiView: View {
    @EnvironmentObject private var depo: OturumDeposu

    var body: some View {
        NavigationStack {
            Group {
                if depo.oturumlar.isEmpty {
                    ContentUnavailableView(
                        "Henüz Oturum Yok",
                        systemImage: "figure.surfing",
                        description: Text("İlk rotanı kaydetmek için Takip sekmesinden başlat.")
                    )
                } else {
                    List {
                        ForEach(depo.oturumlar) { oturum in
                            NavigationLink(value: oturum) {
                                oturumSatiri(oturum)
                            }
                        }
                        .onDelete(perform: sil)
                    }
                }
            }
            .navigationTitle("Geçmiş")
            .navigationDestination(for: RotaOturumu.self) { oturum in
                OturumDetayView(oturum: oturum)
            }
        }
    }

    private func oturumSatiri(_ oturum: RotaOturumu) -> some View {
        HStack {
            Text(oturum.sporTuru.emoji).font(.title)
            VStack(alignment: .leading) {
                Text(oturum.sporTuru.adi).font(.headline)
                Text(oturum.baslangicZamani.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing) {
                Text(String(format: "%.2f km", oturum.toplamMesafeMetre / 1000)).bold()
                Text(DateComponentsFormatter.sup.string(from: oturum.sureSaniye) ?? "-")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func sil(_ indexSet: IndexSet) {
        for index in indexSet {
            depo.sil(id: depo.oturumlar[index].id)
        }
    }
}

extension RotaOturumu: Hashable {
    static func == (lhs: RotaOturumu, rhs: RotaOturumu) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
