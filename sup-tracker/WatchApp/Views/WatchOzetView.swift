import SwiftUI

struct WatchOzetView: View {
    @EnvironmentObject private var depo: OturumDeposu
    let kapat: () -> Void

    private var sonOturum: RotaOturumu? { depo.oturumlar.first }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("Oturum Tamamlandı").font(.headline)
                if let oturum = sonOturum {
                    Text("\(oturum.sporTuru.emoji) \(oturum.sporTuru.adi)")
                    Text(String(format: "%.2f km", oturum.toplamMesafeMetre / 1000))
                        .font(.title2.bold())
                    Label("Sağlık ve iPhone'a gönderildi", systemImage: "checkmark.circle.fill")
                        .font(.caption2)
                        .foregroundStyle(.green)
                }
                Button("Kapat", action: kapat)
                    .tint(.orange)
            }
            .padding()
        }
    }
}
