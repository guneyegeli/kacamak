import Foundation
import HealthKit

/// Desteklenen su sporu türleri.
enum SporTuru: String, Codable, CaseIterable, Identifiable {
    case sup = "sup"
    case kano = "kano"
    case kurek = "kurek"
    case yelken = "yelken"
    case acikSuYuzme = "acik_su_yuzme"
    case kiteSorf = "kite_sorf"
    case surf = "surf"

    var id: String { rawValue }

    var adi: String {
        switch self {
        case .sup: return "SUP (Ayakta Kürek)"
        case .kano: return "Kano / Kayak"
        case .kurek: return "Kürek"
        case .yelken: return "Yelken"
        case .acikSuYuzme: return "Açık Su Yüzme"
        case .kiteSorf: return "Kite Sörf"
        case .surf: return "Sörf"
        }
    }

    var emoji: String {
        switch self {
        case .sup: return "🏄‍♂️"
        case .kano: return "🛶"
        case .kurek: return "🚣"
        case .yelken: return "⛵️"
        case .acikSuYuzme: return "🏊"
        case .kiteSorf: return "🪁"
        case .surf: return "🌊"
        }
    }

    /// HealthKit'e kaydederken kullanılacak antrenman türü.
    var hkWorkoutActivityType: HKWorkoutActivityType {
        switch self {
        case .sup, .kano: return .paddleSports
        case .kurek: return .rowing
        case .yelken: return .sailing
        case .acikSuYuzme: return .swimming
        case .kiteSorf, .surf: return .surfingSports
        }
    }

    /// Strava'nın activity type alanı için karşılık.
    var stravaTuru: String {
        switch self {
        case .sup: return "StandUpPaddling"
        case .kano: return "Canoeing"
        case .kurek: return "Rowing"
        case .yelken: return "Sail"
        case .acikSuYuzme: return "Swim"
        case .kiteSorf: return "Kitesurf"
        case .surf: return "Surfing"
        }
    }
}
