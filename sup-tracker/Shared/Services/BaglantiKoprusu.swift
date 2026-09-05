import Foundation
import WatchConnectivity

/// iPhone <-> Apple Watch arası canlı rota noktası akışı ve SOS tetikleme köprüsü.
final class BaglantiKoprusu: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = BaglantiKoprusu()

    @Published private(set) var karsiCihazUlasilabilir = false

    /// Watch'tan telefona veya telefondan Watch'a canlı GPS noktası ulaştığında tetiklenir.
    var canliNoktaAlindi: ((GPSNoktasi) -> Void)?

    /// Karşı cihazdan SOS tetiklendiğinde tetiklenir.
    var sosAlindi: (() -> Void)?

    /// Tamamlanan bir oturum karşı cihazdan geldiğinde tetiklenir (ör. Watch -> iPhone).
    var oturumAlindi: ((RotaOturumu) -> Void)?

    private override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.karsiCihazUlasilabilir = activationState == .activated
        }
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
    #endif

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.karsiCihazUlasilabilir = session.isReachable
        }
    }

    /// Canlı takip sırasında her yeni GPS noktasını karşı cihaza gönderir (düşük öncelikli, garanti değil).
    func canliNoktaGonder(_ nokta: GPSNoktasi) {
        guard WCSession.default.activationState == .activated else { return }
        let mesaj: [String: Any] = [
            "tip": "canli_nokta",
            "veri": (try? JSONEncoder().encode(nokta)) ?? Data(),
        ]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(mesaj, replyHandler: nil, errorHandler: nil)
        } else {
            WCSession.default.transferUserInfo(mesaj)
        }
    }

    /// SOS tetiklendiğinde karşı cihaza anında haber verir (yüksek öncelikli).
    func sosGonder() {
        guard WCSession.default.activationState == .activated else { return }
        let mesaj: [String: Any] = ["tip": "sos"]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(mesaj, replyHandler: nil, errorHandler: nil)
        }
        WCSession.default.transferUserInfo(mesaj)
    }

    /// Tamamlanan oturumu (ör. Watch bittiğinde) karşı cihaza gönderip Sağlık/Strava
    /// gönderimlerinin telefon tarafında da tetiklenebilmesini sağlar.
    func oturumGonder(_ oturum: RotaOturumu) {
        guard let veri = try? JSONEncoder().encode(oturum) else { return }
        WCSession.default.transferUserInfo(["tip": "oturum", "veri": veri])
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        isle(mesaj: message)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        isle(mesaj: userInfo)
    }

    private func isle(mesaj: [String: Any]) {
        guard let tip = mesaj["tip"] as? String else { return }
        switch tip {
        case "canli_nokta":
            guard let veri = mesaj["veri"] as? Data,
                  let nokta = try? JSONDecoder().decode(GPSNoktasi.self, from: veri) else { return }
            DispatchQueue.main.async { self.canliNoktaAlindi?(nokta) }
        case "sos":
            DispatchQueue.main.async { self.sosAlindi?() }
        case "oturum":
            guard let veri = mesaj["veri"] as? Data,
                  let oturum = try? JSONDecoder().decode(RotaOturumu.self, from: veri) else { return }
            DispatchQueue.main.async { self.oturumAlindi?(oturum) }
        default:
            break
        }
    }
}
