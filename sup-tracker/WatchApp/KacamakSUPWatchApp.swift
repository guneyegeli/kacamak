import SwiftUI

@main
struct KacamakSUPWatchApp: App {
    @StateObject private var antrenmanYoneticisi = AntrenmanYoneticisi.shared
    @StateObject private var acilDurumYoneticisi = AcilDurumYoneticisi.shared
    @StateObject private var koprusu = BaglantiKoprusu.shared
    @StateObject private var depo = OturumDeposu.shared

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                WatchBaslangicView()
            }
            .environmentObject(antrenmanYoneticisi)
            .environmentObject(acilDurumYoneticisi)
            .environmentObject(koprusu)
            .environmentObject(depo)
            .onAppear {
                antrenmanYoneticisi.izinleriIste()
            }
        }
    }
}
