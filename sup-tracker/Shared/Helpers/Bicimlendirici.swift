import Foundation

/// Watch ve iOS ekranlarında ortak kullanılan sayı/metin biçimlendirme yardımcıları.
/// STRATEGY.md §5.8.
enum Bicimlendirici {
    /// "12:34" (saat < 1 ise dakika:saniye) / "1:02:03" (saat ≥ 1 ise saat:dakika:saniye).
    static func sure(_ saniye: TimeInterval) -> String {
        let toplamSaniye = Int(saniye.rounded(.down))
        let saat = toplamSaniye / 3600
        let dakika = (toplamSaniye % 3600) / 60
        let saniyeKalan = toplamSaniye % 60
        if saat > 0 {
            return String(format: "%d:%02d:%02d", saat, dakika, saniyeKalan)
        }
        return String(format: "%d:%02d", dakika, saniyeKalan)
    }

    /// "3.42 km"
    static func mesafeKm(_ metre: Double) -> String {
        String(format: "%.2f km", metre / 1000)
    }

    /// "5.8 km/s"
    static func hizKmS(_ ms: Double) -> String {
        String(format: "%.1f km/s", ms * 3.6)
    }

    /// "13 kn"
    static func ruzgarKnot(_ ms: Double) -> String {
        String(format: "%.0f kn", ms * 1.943844)
    }

    /// "214 kcal" / "—"
    static func kalori(_ kcal: Double?) -> String {
        guard let kcal else { return "—" }
        return String(format: "%.0f kcal", kcal)
    }

    /// "46/dk" / "—"
    static func kurekHizi(_ dakika: Double) -> String {
        guard dakika > 0 else { return "—" }
        return String(format: "%.0f/dk", dakika)
    }
}
