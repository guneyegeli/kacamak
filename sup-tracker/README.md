# Kaçamak SUP Takip

SUP (ayakta kürek), kano, kürek, yelken, açık su yüzme, kite sörf ve sörf gibi su
sporları için **iPhone + Apple Watch** rota takip uygulaması. Kaçamak seyahat
uygulamasından bağımsız, native bir Swift/SwiftUI projesidir (Capacitor tabanlı
`frontend/` uygulamasıyla aynı repoda ama ayrı bir alt proje — watchOS,
Capacitor ile desteklenmediği için native yazıldı).

## Özellikler

- **GPS rota kaydı** — CoreLocation ile canlı rota, mesafe, hız, tempo takibi.
- **Apple Watch uygulaması** — saatten bağımsız çalışır (`WKRunsIndependentlyOfCompanionApp`),
  antrenmanı doğrudan bilekten başlatıp bitirebilirsin; iPhone yakındaysa rota
  `WatchConnectivity` ile canlı senkronize olur.
- **Apple Sağlık entegrasyonu** — her tamamlanan oturum, aktivite türüne uygun
  `HKWorkoutActivityType` (`.paddleSports`, `.sailing`, `.swimming`,
  `.surfingSports`, `.rowing`) ile antrenman + GPS rotası olarak Sağlık'a yazılır.
- **Strava entegrasyonu** — OAuth2 ile giriş yapıp tamamlanan rotayı GPX olarak
  Strava'nın `/api/v3/uploads` uç noktasına gönderir.
- **Acil durum** — kayıtlı yakınlara ve Sahil Güvenliği'ne (158) / 112'ye tek
  dokunuşla arama ve konum içeren SMS gönderimi. Watch'tan tetiklenen SOS,
  iPhone menzildeyken anında iPhone'a bildirim olarak düşer.

## Uydu / Sahil Güvenliği hakkında önemli not

Apple, üçüncü taraf uygulamalara **uydu üzerinden mesajlaşma için genel bir API
sunmuyor**. iPhone 14 ve sonrası cihazlardaki "Acil SOS (Uydu)" özelliği yalnızca
işletim sisteminin kendi acil durum akışı (yan tuşa basılı tutma) üzerinden
çalışır; hiçbir üçüncü taraf uygulama bunu tetikleyemez ya da özelleştiremez.
Bu nedenle uygulama iki katmanlı, gerçekçi bir yaklaşım izliyor:

1. **Hücresel/Wi-Fi VARSA:** Acil Durum ekranından konumu okuyup kayıtlı
   yakınlara SMS, Sahil Güvenliği'ne (158) ve 112'ye tek dokunuşla arama.
2. **Sinyal YOKSA (açık denizde tipik durum):** Uygulama kullanıcıyı cihazın
   kendi **Acil SOS (Uydu)** akışını başlatmaya yönlendirir ve son bilinen GPS
   konumunu büyük punto ile ekranda gösterir (telsizle/uydu mesajıyla sözlü
   iletilebilmesi için). Sahil Güvenliği Türkiye'de deniz kazası/kayıp
   ihbarlarını **158** hattından alır; bu numara uygulamada sabit olarak
   tanımlıdır (`AcilKisi.sahilGuvenligi`).

Gerçek bir "uçtan uca uydu üzerinden Sahil Güvenliği'ne otomatik konum
gönderme" özelliği ancak Apple'ın kendi sisteminin arka planındaki bir servisle
(bugün için yalnızca Apple'a ait) ya da harici bir uydu donanımı/SDK'sı
(ör. Garmin inReach, Zoleo) entegrasyonuyla mümkündür — bu proje o donanımlara
kolayca genişletilebilecek şekilde (`AcilDurumYoneticisi`) tasarlandı, ancak
şu an için gerçek bir uydu SDK'sına bağlı değil.

## Proje yapısı

```
sup-tracker/
  project.yml           # XcodeGen proje tanımı (iOS + watchOS hedefleri)
  Shared/                # Her iki hedefte de kullanılan model ve servisler
    Models/
      SporTuru.swift          # Spor türleri (SUP, kano, kürek, yelken, ...)
      GPSNoktasi.swift        # Tek bir GPS örneği
      RotaOturumu.swift       # Bir antrenman oturumu + istatistikler
      AcilKisi.swift          # Acil durum kişisi / Sahil Güvenliği / 112
    Services/
      KonumYoneticisi.swift       # CoreLocation sarmalayıcı
      SaglikYoneticisi.swift      # HealthKit (canlı oturum + manuel kayıt)
      StravaServisi.swift         # Strava OAuth2 + GPX yükleme
      RotaDisaAktarici.swift      # GPX dosyası oluşturma
      AcilDurumYoneticisi.swift   # SOS / acil durum akışı
      OturumDeposu.swift          # Yerel JSON depolama
      BaglantiKoprusu.swift       # iPhone <-> Watch WatchConnectivity köprüsü
      AntrenmanYoneticisi.swift   # Tüm servisleri birleştiren koordinatör
  iOS/                    # iPhone hedefi (SwiftUI)
  WatchApp/               # Apple Watch hedefi (SwiftUI, bağımsız çalışabilir)
```

## Kurulum

Bu proje bir Xcode `.xcodeproj` dosyası içermez; [XcodeGen](https://github.com/yonaskolb/XcodeGen)
ile üretilir (repoya binary/XML proje dosyası commit'lemek yerine metin tabanlı
`project.yml` tutmak diff'leri okunur kılar):

```bash
brew install xcodegen
cd sup-tracker
xcodegen generate
open KacamakSUP.xcodeproj
```

### Gerekli yapılandırma

1. **Apple Developer hesabı** — `project.yml` içindeki `DEVELOPMENT_TEAM`
   ortam değişkenini kendi takım ID'nizle ayarlayın, HealthKit capability'sini
   Apple Developer portalından App ID'ye ekleyin.
2. **Strava API** — https://www.strava.com/settings/api üzerinden bir uygulama
   oluşturup Client ID/Secret'i Xcode build ayarlarında `STRAVA_CLIENT_ID` /
   `STRAVA_CLIENT_SECRET` olarak tanımlayın (Info.plist bunları `$(...)` ile
   okuyor). **Üretimde client secret'i uygulamaya gömmek yerine token
   değişimini bir backend proxy üzerinden yapmanız önerilir.**
3. **Gerçek cihaz** — HealthKit, arka plan konum takibi ve Apple Watch
   simülatörde tam çalışmaz; iPhone + Apple Watch çiftinde test edin.
4. **watchOS bağımsız çalışma** — `WKRunsIndependentlyOfCompanionApp` açık
   olduğundan Watch uygulaması iPhone yanında olmadan da (yalnız GPS Watch
   modelinde) bir oturum kaydedebilir; iPhone'a yeniden bağlanınca oturum
   otomatik senkronize olur.

## Bilinen sınırlamalar / sonraki adımlar

- Strava token'ları şu an `UserDefaults`'ta tutuluyor; üretimde Keychain'e
  taşınmalı.
- Gerçek uydu/harici acil durum donanımı (Garmin inReach vb.) entegre değil;
  `AcilDurumYoneticisi` bu tür bir SDK eklemeye uygun şekilde ayrıştırıldı.
- Birim testleri henüz eklenmedi.
