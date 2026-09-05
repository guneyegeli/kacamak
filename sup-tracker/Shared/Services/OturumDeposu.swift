import Foundation
import Combine

/// Tamamlanan rota oturumlarının cihaz üzerinde (JSON) saklanması.
/// iPhone ve Watch her biri kendi kopyasını tutar; senkronizasyon BaglantiKoprusu ile yapılır.
final class OturumDeposu: ObservableObject {
    static let shared = OturumDeposu()

    @Published private(set) var oturumlar: [RotaOturumu] = []

    private var dosyaURL: URL {
        let klasor = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return klasor.appendingPathComponent("oturumlar.json")
    }

    init() {
        oturumlar = oku()
    }

    func kaydet(_ oturum: RotaOturumu) {
        if let index = oturumlar.firstIndex(where: { $0.id == oturum.id }) {
            oturumlar[index] = oturum
        } else {
            oturumlar.insert(oturum, at: 0)
        }
        diskeYaz()
    }

    func sil(id: UUID) {
        oturumlar.removeAll { $0.id == id }
        diskeYaz()
    }

    private func diskeYaz() {
        guard let veri = try? JSONEncoder().encode(oturumlar) else { return }
        try? veri.write(to: dosyaURL, options: .atomic)
    }

    private func oku() -> [RotaOturumu] {
        guard let veri = try? Data(contentsOf: dosyaURL),
              let oturumlar = try? JSONDecoder().decode([RotaOturumu].self, from: veri) else { return [] }
        return oturumlar
    }
}
