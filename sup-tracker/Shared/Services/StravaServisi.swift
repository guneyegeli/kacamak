import Foundation
#if os(iOS)
import AuthenticationServices
#endif

/// Strava OAuth2 girişi ve tamamlanan rotanın GPX olarak yüklenmesi.
///
/// Kurulum: https://www.strava.com/settings/api adresinden bir uygulama oluşturup
/// `Client ID` / `Client Secret` değerlerini Info.plist'e (veya güvenli bir yapılandırma
/// dosyasına) `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` anahtarlarıyla ekleyin.
/// Client secret'ı doğrudan uygulamaya gömmek yerine üretimde bir backend proxy
/// (token değişimini sunucu tarafında yapan) kullanılması önerilir.
final class StravaServisi: NSObject, ObservableObject {
    static let shared = StravaServisi()

    @Published private(set) var baglıMi = false

    private let anahtarSakla = "strava_tokenlari"

    private struct TokenSeti: Codable {
        var erisimTokeni: String
        var yenilemeTokeni: String
        var sonaErmeZamani: Date
    }

    private var clientID: String {
        Bundle.main.object(forInfoDictionaryKey: "STRAVA_CLIENT_ID") as? String ?? ""
    }

    private var clientSecret: String {
        Bundle.main.object(forInfoDictionaryKey: "STRAVA_CLIENT_SECRET") as? String ?? ""
    }

    private let redirectURI = "kacamaksup://strava-auth"

    override init() {
        super.init()
        baglıMi = tokenOku() != nil
    }

    #if os(iOS)
    private var webOturumu: ASWebAuthenticationSession?

    func girisYap(sunanPencere: ASWebAuthenticationPresentationContextProviding, tamamlaninca: @escaping (Bool) -> Void) {
        var bilesenler = URLComponents(string: "https://www.strava.com/oauth/mobile/authorize")!
        bilesenler.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "approval_prompt", value: "auto"),
            URLQueryItem(name: "scope", value: "activity:write,activity:read_all"),
        ]

        let oturum = ASWebAuthenticationSession(url: bilesenler.url!, callbackURLScheme: "kacamaksup") { [weak self] geriDonenURL, hata in
            guard let self, let geriDonenURL, hata == nil,
                  let kod = URLComponents(url: geriDonenURL, resolvingAgainstBaseURL: false)?
                    .queryItems?.first(where: { $0.name == "code" })?.value else {
                tamamlaninca(false)
                return
            }
            self.tokenDegisimiYap(kod: kod, tamamlaninca: tamamlaninca)
        }
        oturum.presentationContextProvider = sunanPencere
        oturum.prefersEphemeralWebBrowserSession = false
        webOturumu = oturum
        oturum.start()
    }
    #endif

    private func tokenDegisimiYap(kod: String, tamamlaninca: @escaping (Bool) -> Void) {
        var istek = URLRequest(url: URL(string: "https://www.strava.com/oauth/token")!)
        istek.httpMethod = "POST"
        istek.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let govde = "client_id=\(clientID)&client_secret=\(clientSecret)&code=\(kod)&grant_type=authorization_code"
        istek.httpBody = govde.data(using: .utf8)

        URLSession.shared.dataTask(with: istek) { [weak self] veri, _, _ in
            guard let self, let veri else {
                DispatchQueue.main.async { tamamlaninca(false) }
                return
            }
            self.tokenYanitiniIsle(veri, tamamlaninca: tamamlaninca)
        }.resume()
    }

    private func tokenYanitiniIsle(_ veri: Data, tamamlaninca: @escaping (Bool) -> Void) {
        struct Yanit: Decodable {
            let access_token: String
            let refresh_token: String
            let expires_at: TimeInterval
        }
        guard let yanit = try? JSONDecoder().decode(Yanit.self, from: veri) else {
            DispatchQueue.main.async { tamamlaninca(false) }
            return
        }
        let tokenSeti = TokenSeti(
            erisimTokeni: yanit.access_token,
            yenilemeTokeni: yanit.refresh_token,
            sonaErmeZamani: Date(timeIntervalSince1970: yanit.expires_at)
        )
        tokenKaydet(tokenSeti)
        DispatchQueue.main.async {
            self.baglıMi = true
            tamamlaninca(true)
        }
    }

    func baglantiyiKes() {
        UserDefaults.standard.removeObject(forKey: anahtarSakla)
        baglıMi = false
    }

    /// Geçerli bir erişim tokeni döner; süresi dolmuşsa otomatik yeniler.
    private func gecerliToken(tamamlaninca: @escaping (String?) -> Void) {
        guard var tokenSeti = tokenOku() else {
            tamamlaninca(nil)
            return
        }
        guard tokenSeti.sonaErmeZamani < Date() else {
            tamamlaninca(tokenSeti.erisimTokeni)
            return
        }
        var istek = URLRequest(url: URL(string: "https://www.strava.com/oauth/token")!)
        istek.httpMethod = "POST"
        istek.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let govde = "client_id=\(clientID)&client_secret=\(clientSecret)&grant_type=refresh_token&refresh_token=\(tokenSeti.yenilemeTokeni)"
        istek.httpBody = govde.data(using: .utf8)

        URLSession.shared.dataTask(with: istek) { [weak self] veri, _, _ in
            struct Yanit: Decodable {
                let access_token: String
                let refresh_token: String
                let expires_at: TimeInterval
            }
            guard let veri, let yanit = try? JSONDecoder().decode(Yanit.self, from: veri) else {
                tamamlaninca(nil)
                return
            }
            tokenSeti.erisimTokeni = yanit.access_token
            tokenSeti.yenilemeTokeni = yanit.refresh_token
            tokenSeti.sonaErmeZamani = Date(timeIntervalSince1970: yanit.expires_at)
            self?.tokenKaydet(tokenSeti)
            tamamlaninca(tokenSeti.erisimTokeni)
        }.resume()
    }

    /// Tamamlanan oturumu GPX olarak Strava'ya yükler.
    func aktiviteYukle(_ oturum: RotaOturumu, tamamlaninca: @escaping (Result<String, Error>) -> Void) {
        gecerliToken { [weak self] token in
            guard let self, let token else {
                tamamlaninca(.failure(StravaHatasi.girisGerekli))
                return
            }
            guard let gpxURL = RotaDisaAktarici.gpxDosyasiOlustur(oturum) else {
                tamamlaninca(.failure(StravaHatasi.dosyaOlusturulamadi))
                return
            }
            self.multipartYukle(gpxURL: gpxURL, oturum: oturum, token: token, tamamlaninca: tamamlaninca)
        }
    }

    private func multipartYukle(gpxURL: URL, oturum: RotaOturumu, token: String, tamamlaninca: @escaping (Result<String, Error>) -> Void) {
        var istek = URLRequest(url: URL(string: "https://www.strava.com/api/v3/uploads")!)
        istek.httpMethod = "POST"
        istek.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let sinir = "Boundary-\(UUID().uuidString)"
        istek.setValue("multipart/form-data; boundary=\(sinir)", forHTTPHeaderField: "Content-Type")

        var govde = Data()
        func alanEkle(_ isim: String, _ deger: String) {
            govde.append("--\(sinir)\r\n".data(using: .utf8)!)
            govde.append("Content-Disposition: form-data; name=\"\(isim)\"\r\n\r\n".data(using: .utf8)!)
            govde.append("\(deger)\r\n".data(using: .utf8)!)
        }
        alanEkle("data_type", "gpx")
        alanEkle("name", "\(oturum.sporTuru.adi) - Kaçamak SUP")
        alanEkle("activity_type", oturum.sporTuru.stravaTuru.lowercased())

        if let gpxVeri = try? Data(contentsOf: gpxURL) {
            govde.append("--\(sinir)\r\n".data(using: .utf8)!)
            govde.append("Content-Disposition: form-data; name=\"file\"; filename=\"rota.gpx\"\r\n".data(using: .utf8)!)
            govde.append("Content-Type: application/gpx+xml\r\n\r\n".data(using: .utf8)!)
            govde.append(gpxVeri)
            govde.append("\r\n".data(using: .utf8)!)
        }
        govde.append("--\(sinir)--\r\n".data(using: .utf8)!)
        istek.httpBody = govde

        URLSession.shared.dataTask(with: istek) { veri, _, hata in
            if let hata {
                DispatchQueue.main.async { tamamlaninca(.failure(hata)) }
                return
            }
            struct YuklemeYaniti: Decodable { let id_str: String? }
            guard let veri, let yanit = try? JSONDecoder().decode(YuklemeYaniti.self, from: veri), let id = yanit.id_str else {
                DispatchQueue.main.async { tamamlaninca(.failure(StravaHatasi.yuklemeBasarisiz)) }
                return
            }
            DispatchQueue.main.async { tamamlaninca(.success(id)) }
        }.resume()
    }

    // MARK: - Token saklama (Keychain'e taşınması önerilir; burada basitlik için UserDefaults kullanıldı)

    private func tokenKaydet(_ tokenSeti: TokenSeti) {
        guard let veri = try? JSONEncoder().encode(tokenSeti) else { return }
        UserDefaults.standard.set(veri, forKey: anahtarSakla)
    }

    private func tokenOku() -> TokenSeti? {
        guard let veri = UserDefaults.standard.data(forKey: anahtarSakla) else { return nil }
        return try? JSONDecoder().decode(TokenSeti.self, from: veri)
    }
}

enum StravaHatasi: LocalizedError {
    case girisGerekli
    case dosyaOlusturulamadi
    case yuklemeBasarisiz

    var errorDescription: String? {
        switch self {
        case .girisGerekli: return "Strava'ya giriş yapmanız gerekiyor."
        case .dosyaOlusturulamadi: return "Rota dosyası oluşturulamadı."
        case .yuklemeBasarisiz: return "Strava'ya yükleme başarısız oldu."
        }
    }
}
