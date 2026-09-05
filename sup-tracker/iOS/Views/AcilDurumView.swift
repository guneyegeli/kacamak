import SwiftUI
import CoreLocation
import MessageUI

struct AcilDurumView: View {
    @EnvironmentObject private var acilDurumYoneticisi: AcilDurumYoneticisi
    @EnvironmentObject private var antrenmanYoneticisi: AntrenmanYoneticisi
    @State private var konum: CLLocation?
    @State private var konumAraniyor = true
    @State private var mesajGosteriliyor = false
    @State private var mesajAlicisi: AcilKisi?
    @State private var yeniKisiFormuGosteriliyor = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    uyariKutusu

                    konumKarti

                    VStack(spacing: 12) {
                        ForEach(acilDurumYoneticisi.tumKisiler) { kisi in
                            kisiSatiri(kisi)
                        }
                    }

                    Button {
                        yeniKisiFormuGosteriliyor = true
                    } label: {
                        Label("Yakın Ekle", systemImage: "person.badge.plus")
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            }
            .navigationTitle("Acil Durum")
            .onAppear(perform: konumGuncelle)
            .sheet(isPresented: $yeniKisiFormuGosteriliyor) {
                YeniAcilKisiFormu()
            }
            .sheet(isPresented: $mesajGosteriliyor) {
                if let alici = mesajAlicisi, MFMessageComposeViewController.canSendText() {
                    SmsGondericiView(
                        alicilar: [alici.telefonNumarasi],
                        govde: acilDurumYoneticisi.sosMetniOlustur(konum: konum, sporTuru: antrenmanYoneticisi.aktifOturum?.sporTuru)
                    )
                }
            }
        }
    }

    private var uyariKutusu: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Bu ekran hücresel/Wi-Fi bağlantısı üzerinden çalışır", systemImage: "antenna.radiowaves.left.and.right")
                .font(.headline)
            Text("Açık denizde çekim yoksa aşağıdaki butonlar çalışmaz. Sinyal yoksa cihazının yan tuşunu basılı tutarak iOS'un kendi **Acil SOS (Uydu)** özelliğini kullan — bu, Apple'ın işletim sistemi seviyesinde sunduğu ve üçüncü taraf uygulamaların tetikleyemediği resmi bir özelliktir.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.red.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
    }

    private var konumKarti: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Son Bilinen Konum").font(.caption).foregroundStyle(.secondary)
            if konumAraniyor {
                ProgressView("Konum alınıyor…")
            } else if let konum {
                Text("\(konum.coordinate.latitude, specifier: "%.5f"), \(konum.coordinate.longitude, specifier: "%.5f")")
                    .font(.system(.body, design: .monospaced))
                    .textSelection(.enabled)
            } else {
                Text("Konum alınamadı").foregroundStyle(.red)
            }
            Button("Konumu Yenile", action: konumGuncelle)
                .font(.footnote)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func kisiSatiri(_ kisi: AcilKisi) -> some View {
        HStack {
            VStack(alignment: .leading) {
                Text(kisi.isim).bold()
                Text(kisi.iliski).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                acilDurumYoneticisi.ara(numara: kisi.telefonNumarasi)
            } label: {
                Image(systemName: "phone.fill")
            }
            .buttonStyle(.bordered)
            .tint(.green)

            if !kisi.resmiKurumMu {
                Button {
                    mesajAlicisi = kisi
                    mesajGosteriliyor = true
                } label: {
                    Image(systemName: "message.fill")
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .background(kisi.resmiKurumMu ? Color.orange.opacity(0.15) : Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 10))
    }

    private func konumGuncelle() {
        konumAraniyor = true
        antrenmanYoneticisi.acilDurumIcinKonumAl { yeniKonum in
            konum = yeniKonum
            konumAraniyor = false
        }
    }
}

private struct YeniAcilKisiFormu: View {
    @EnvironmentObject private var acilDurumYoneticisi: AcilDurumYoneticisi
    @Environment(\.dismiss) private var dismiss
    @State private var isim = ""
    @State private var telefon = ""
    @State private var iliski = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("İsim", text: $isim)
                TextField("Telefon Numarası", text: $telefon).keyboardType(.phonePad)
                TextField("Yakınlık (Eş, Aile, Tekne Kulübü…)", text: $iliski)
            }
            .navigationTitle("Yakın Ekle")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("İptal") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Kaydet") {
                        acilDurumYoneticisi.kisiEkle(AcilKisi(isim: isim, telefonNumarasi: telefon, iliski: iliski))
                        dismiss()
                    }
                    .disabled(isim.isEmpty || telefon.isEmpty)
                }
            }
        }
    }
}

private struct SmsGondericiView: UIViewControllerRepresentable {
    let alicilar: [String]
    let govde: String

    func makeUIViewController(context: Context) -> MFMessageComposeViewController {
        let vc = MFMessageComposeViewController()
        vc.recipients = alicilar
        vc.body = govde
        vc.messageComposeDelegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ uiViewController: MFMessageComposeViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator: NSObject, MFMessageComposeViewControllerDelegate {
        func messageComposeViewController(_ controller: MFMessageComposeViewController, didFinishWith result: MessageComposeResult) {
            controller.dismiss(animated: true)
        }
    }
}
