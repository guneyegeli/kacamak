import SwiftUI
import UserNotifications

@main
struct KacamakSUPApp: App {
    @StateObject private var antrenmanYoneticisi = AntrenmanYoneticisi.shared
    @StateObject private var depo = OturumDeposu.shared
    @StateObject private var acilDurumYoneticisi = AcilDurumYoneticisi.shared
    @StateObject private var koprusu = BaglantiKoprusu.shared

    init() {
        // Watch'tan gelen tamamlanmış oturumları depoya yazıp Sağlık/Strava akışını tetikle.
        BaglantiKoprusu.shared.oturumAlindi = { oturum in
            OturumDeposu.shared.kaydet(oturum)
            SaglikYoneticisi.shared.manuelOturumKaydet(oturum) { _ in }
        }

        // Watch'tan SOS tetiklenirse iPhone sahibini yerel bildirimle uyar; kullanıcı
        // Acil Durum sekmesinden tek dokunuşla Sahil Güvenliği'ni arayabilir/mesaj atabilir.
        BaglantiKoprusu.shared.sosAlindi = {
            let icerik = UNMutableNotificationContent()
            icerik.title = "🆘 SOS - Apple Watch'tan Acil Durum Sinyali"
            icerik.body = "Watch'tan acil durum bildirimi geldi. Acil Durum sekmesini açıp Sahil Güvenliği'ni ara."
            icerik.sound = .defaultCritical
            let istek = UNNotificationRequest(identifier: UUID().uuidString, content: icerik, trigger: nil)
            UNUserNotificationCenter.current().add(istek)
        }
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    var body: some Scene {
        WindowGroup {
            AnaSekmeView()
                .environmentObject(antrenmanYoneticisi)
                .environmentObject(depo)
                .environmentObject(acilDurumYoneticisi)
                .environmentObject(koprusu)
                .onAppear {
                    antrenmanYoneticisi.izinleriIste()
                }
        }
    }
}
