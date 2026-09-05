# Kaçamak SUP Takip — Ürün & Teknik Strateji (v2 Özellikleri)

> Kapsam: Kalori vurgusu, kürek çekme performansı (stroke rate), anlık rüzgar + saatlik/günlük rüzgar tahmini ve Watch "tek bakışta" özet ekranı.
> Bu doküman kod içermez; farklı ajanların birbirinden bağımsız ama uyumlu kod yazabilmesi için karar + arayüz sözleşmesi sağlar.
> Mevcut kod tarzı referansı: `Shared/Models/RotaOturumu.swift`, `Shared/Services/AntrenmanYoneticisi.swift`, `WatchApp/Views/WatchTakipView.swift`.

---

## 0. Yönetici Özeti (kararlar)

| Konu | Karar |
|---|---|
| Rüzgar veri kaynağı | **Open-Meteo** (anahtarsız, ücretsiz, saatlik+günlük+anlık gust dahil). `RuzgarSaglayici` protokolü arkasına konur; ileride WeatherKit'e geçiş tek sınıf değişimi olur. |
| Rüzgarın Watch'a ulaşması | Birincil: iPhone çeker → `BaglantiKoprusu` `applicationContext` ile Watch'a iter. İkincil: Watch (cellular/Wi-Fi varsa) doğrudan `URLSession`. Son çare: son önbellek + "eski veri" rozeti. |
| Kürek algılama | `CMMotionManager.deviceMotion` @ 50 Hz, `userAcceleration` büyüklüğü → band-pass → uyarlanabilir eşik + refractory (debounce) tepe sayımı. ML yok. |
| Watch ana ekran | Dikey sayfalı `TabView` (`.verticalPage`, watchOS 10+). Orta sayfa = **Bir Bakışta**: 6 sabit veri (Mesafe, Süre, Kalori, Nabız, Kürek/dk, Rüzgar). Üst sayfa = Kontroller, alt sayfalar = Kürek Detayı, Rüzgar Detayı. |
| Model değişikliği | `RotaOturumu`'na kürek ve rüzgar alanları eklenir; eski JSON'lar için `decodeIfPresent` ile geriye dönük uyumluluk şart. |

---

## 1. Rekabet Analizi

Yöntem: App Store sayfaları, geliştirici yardım merkezleri, ürün blogları ve inceleme yazıları (kaynaklar §7'de). Doğrulanamayan noktalar açıkça **"bulunamadı"** olarak işaretlendi.

### 1.1 Kürek/SUP takip uygulamaları

| Uygulama | Watch'ta antrenman sırasında gösterilen | Tek ekranda veri sayısı | Stroke (kürek) sayımı | Rüzgar verisi | Not |
|---|---|---|---|---|---|
| **Paddle Logger** (SUP/Kayak/Kano) | Süre, mesafe, nabız; hız ve ortalama tempo | 3–5 | **Yok** (yardım dokümanında/bildirimlerde stroke sayımı bulunamadı) | Planlama için "yerel rüzgar ve gelgit bilgisi" (iPhone tarafı). Veri kaynağı **bulunamadı** | Bağımsız Watch app, Ultra Action Button, Water Lock, PaddleLIVE canlı konum paylaşımı, PaddlePLAN rota, abonelik |
| **Paddlr** | Süre, mesafe, tempo, stroke count/SPM | ~4 | **Var**, sadece *kayak* ve *crew (kürek)* için Watch'ta gerçek zamanlı kadans; **SUP için yok** ("en çok istenen özellik") | Bulunamadı | Kadans alarmı (min. SPM), kadans grafiği, "distance per stroke yakında" |
| **SUP Tracker: Paddle GPS** | Mesafe, süre, hız, rota, kalori, nabız | 4–5 | **Var** (v3.0): stroke count + **stroke balance** (sağ/sol denge) | Hava tahmini + kendi "SUP Score"u. Kaynak **bulunamadı** | Tek seferlik ücret |
| **GoSUP** | Kullanıcı seçer: kürek sayısı, mesafe vb. ("custom workout screen"), nabız bölgesi | Kullanıcı tanımlı | **Var**: yeni algoritma, "hangi bilekte olursa olsun" çalışıyor; kadans + verimlilik | Bulunamadı | Ultra'da su sıcaklığı / suya giriş tespiti |
| **Paddlz** | Strokes, mesafe, hız, nabız, kalori | ~5 | **Var** | Bulunamadı | — |
| **Waterspeed** (30+ su sporu) | Hız, mesafe, nabız, konum (bağımsız Watch) | 3–4 | "Stroke metrics" + tack/gybe + foil süresi (yöntem **bulunamadı**) | "Wind" alanı listeleniyor, kaynak **bulunamadı** | Garmin/Suunto/Coros/Vakaros entegre; Free/Pro/Ultra |
| **Kayak Tracker** | Mesafe, süre, stroke rate, ortalama hız, nabız, yükseklik | 4–6 | Var | Bulunamadı | Sadece Apple |
| **Kayak Session / Onboard SUP** | — | — | — | — | Bu isimlerle bir Watch uygulaması **bulunamadı** (Kayak Session bir dergi) |
| **Motionize SUP** | Stroke count + rate, hız, mesafe, nabız, kalori | 5–6 | Var (harici küreğe takılan sensör ile) | — | Harici donanım gerektiriyor; bizim için referans değil |

**Çıkarım 1:** Piyasada SUP için *bilek ivmeölçerle* güvenilir stroke sayımı hâlâ farklılaştırıcı (Paddlr yapamıyor, GoSUP ve SUP Tracker yeni ekledi). "Stroke balance" (sağ/sol) SUP Tracker'ın hoş bir dokunuşu; v2'de yapılabilir, MVP'ye şart değil.
**Çıkarım 2:** Hiçbir kürek uygulaması Watch'ta *antrenman sırasında* rüzgarı göstermiyor; rüzgar sadece iPhone'da planlama aşamasında. Watch'ta canlı rüzgar + gust göstermek net bir farklılaşma.

### 1.2 Sörf / rüzgar uygulamaları (glanceable tasarım referansı)

| Uygulama | Watch'ta gösterilen | Tek ekran veri sayısı | Rüzgar kaynağı | Stroke/dalga sayımı |
|---|---|---|---|---|
| **Dawn Patrol** (sörf) | Dalga sayısı, sörf edilen mesafe, su süresi, gelgit; dalga başına süre/uzunluk/maks hız | 3–4 | Surfline tahmini (Premium) | Dalga tespiti GPS hız profili (ayrıntı **bulunamadı**) |
| **Surfline Sessions** | Yakalanan dalga, maks hız, en uzun sürüş | 3 | Surfline (kendi LOTUS modeli) | Kamera + GPS |
| **Windy.com** Watch | 10 gün / 3 saatlik tahmin: yağış, rüzgar, yön, çiy noktası; "Windy Wind" komplikasyonu = **ok + hız** | Komplikasyonda 2, listede 4 | ECMWF/GFS/ICON | — |
| **Windy.app** Watch | Şu an + 3/6/9 saat sonrası rüzgar hızı & yönü, gust, dalga enerjisi, swell yükseklik/periyot; pusula | 4–6 | Kendi model karışımı | — |
| **Windfinder** | Watch uygulaması **bulunamadı**; iPhone'da 3 saatlik 10 gün, Superforecast saatlik, 21.000 istasyon | — | GFS + yerel modeller | — |
| **PredictWind** | Watch uygulaması **bulunamadı** (Tracker/Offshore iPhone) | — | PWG/PWE kendi modelleri | — |

**Çıkarım 3:** Watch'ta rüzgar sunumunun endüstri standardı **"yön oku + hız (+ gust)"** ve **3/6/9 saatlik mini zaman çizelgesi**. Biz de aynı görsel dili kullanmalıyız (kullanıcı beklentisi).

### 1.3 Genel spor / dashboard referansları

| Ürün | Bir bakışta düzen kalıbı | Bize uyarlanacak ders |
|---|---|---|
| **Apple Workout (watchOS 10+)** | Digital Crown döndürülünce dikey sayfalar arasında geçiş; her "Metrics" görünümünde 4–5 metrik; Metrics/Metrics 2 kullanıcı tanımlı | Dikey sayfa + Crown = kullanıcıların ezbere bildiği model. Paddling türünde GPS/stroke **yok** → boşluk |
| **Strava Watch (Eyl 2025 yeniden tasarım)** | Süre, nabız, spora özel tek istatistik (tempo), yükseklik; Live Segment banner'ı | Az sayıda büyük rakam + duruma göre beliren banner (bizde: gust uyarısı) |
| **WHOOP** | Ekransız; iPhone dashboard'da 5 sağlık göstergesi "aralıkta mı?" renk koduyla; tek skor | Rüzgar için tek renkli "güvenlik durumu" (yeşil/sarı/kırmızı) fikri |
| **Garmin (SUP/Row)** | Native "Strokes/min", "Dist. per stroke"; Connect IQ "Dozen Paddle" 12 alan | Distance-per-stroke = verimlilik metriği olarak standart; Kayak aktivitesinde stroke yok (kullanıcı şikâyeti) |

### 1.4 Referans stroke rate aralıkları (SUP)

Kaynaklardan derlenen tipik değerler (algoritma eşikleri ve UI renk bantları için):

| Yoğunluk | Kürek/dk |
|---|---|
| Yavaş / ısınma | 15–35 |
| Orta / rekreasyonel | 30–45 |
| Hızlı / yarış temposu | 45–60 |
| Elit uzun mesafe | 55–70 |
| Sprint (200 m) | ~100–120 |

Araştırma notu: uluslararası yarışçılarda 45 spm, 55 spm'ye göre %13 daha verimli bulunmuş → "daha hızlı kürek = daha iyi" değil, **mesafe/kürek** göstermek anlamlı.

---

## 2. Rüzgar Veri Kaynağı Kararı

### 2.1 Karşılaştırma

| Kriter | Apple WeatherKit | Open-Meteo |
|---|---|---|
| Maliyet | Apple Developer Program (99 $/yıl) ile 500.000 çağrı/ay dahil; sonrası kademeli (1M = 49,99 $ …) | Ücretsiz; ticari olmayan kullanım. Günlük 10.000 / saatlik 5.000 / dakikalık 600 çağrı sınırı |
| Anahtar / kurulum | App ID'de WeatherKit capability + `com.apple.developer.weatherkit` entitlement; Service ID; provisioning yenileme | **Anahtar yok**, kayıt yok |
| Platform | iOS 16+, **watchOS 9+** (Swift API) | Herhangi bir HTTP istemcisi (Watch dahil) |
| Anlık rüzgar | `currentWeather.wind` → `speed`, `direction`, `gust?` (Measurement) | `current=wind_speed_10m,wind_direction_10m,wind_gusts_10m` |
| Saatlik | 10 gün saatlik, `hourlyForecast[i].wind.gust` | 16 güne kadar saatlik `wind_gusts_10m` dahil |
| Günlük | `dailyForecast[i].wind` (maks hız/yön) | `daily=wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant` |
| Deniz/dalga | Yok | Ayrı **Marine API** (`wave_height`, `wave_period`, `swell_wave_height` …) — ileride sörf/yelken için |
| Birim | `Measurement<UnitSpeed>` — kolay dönüşüm | `wind_speed_unit=kmh\|ms\|mph\|kn` (varsayılan kmh) |
| Atıf | **Zorunlu**: "Apple Weather" markası + veri kaynakları bağlantısı ekranda gösterilmeli | CC BY 4.0: "Weather data by Open-Meteo.com" |
| Model kalitesi | Apple Weather Service (birleşik modeller + ML) | ECMWF IFS, DWD ICON, NOAA GFS/HRRR, Météo-France AROME/ARPEGE, MET Norway vb. "best match" |
| Risk | Entitlement/provisioning kırılganlığı; TestFlight/CI'da sık yaşanan yetki hataları; sınırlı kota aşımı ücretli | "Ticari kullanım" tanımı: uygulama ücretsiz ama affiliate geliri varsa ticari sayılabilir → ileride API abonelik planına geçiş (özel host `customer-api.open-meteo.com` + `apikey`) gerekebilir; uptime garantisi yok |

### 2.2 Karar: **Open-Meteo** (MVP ve ilk sürüm)

Gerekçe:
1. Anahtar/entitlement olmadan **hemen** implemente edilir; Watch'tan doğrudan da çağrılabilir (WeatherKit Swift API'si watchOS'ta çalışsa da her hedefte ayrı entitlement ve Apple hesabı gerektirir).
2. Gust (`wind_gusts_10m`) hem anlık hem saatlik hem günlük düzeyde mevcut — su sporcusu için kritik.
3. Marine API ile aynı istemci deseniyle dalga/swell eklenebilir (sörf, kite, yelken türleri için doğal uzantı).
4. `RuzgarSaglayici` protokolü sayesinde ileride `WeatherKitRuzgarSaglayici` eklemek tek dosya.

Koşul: Mağaza açıklamasında ve Rüzgar Detayı ekranının altında **"Rüzgar verisi: Open-Meteo.com (CC BY 4.0)"** atfı zorunlu. Uygulama gelir üretmeye başlarsa Open-Meteo abonelik planı (ticari lisans) alınmalı; sözleşme protokol tabanlı olduğu için host/apikey değişimi `OpenMeteoRuzgarSaglayici` içinde kalır.

### 2.3 Doğrulanmış endpoint yapısı

> Not: Bu sandbox'ta `api.open-meteo.com` ağ proxy'si tarafından engellendiği için canlı yanıt alınamadı. Değişken adları Open-Meteo'nun kendi kaynak deposundaki `openapi/forecast.yml`, `openapi/marine.yml` ve `Sources/App/Controllers/VariableDaily.swift` dosyalarından; yanıt şeması Open-Meteo ile çalışan açık kaynak Swift istemcilerinden doğrulandı. İmplementasyon ajanı ilk işte aşağıdaki URL'yi bir kez `curl` ile çalıştırıp `Decodable` yapıyı teyit etmeli.

**Tahmin (anlık + saatlik + günlük) — tek istek:**

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=41.0082
  &longitude=28.9784
  &current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,is_day
  &hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m
  &daily=wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant
  &wind_speed_unit=ms
  &timezone=auto
  &forecast_days=3
```

Parametre notları:
- `wind_speed_unit`: `kmh` (varsayılan) | `ms` | `mph` | `kn`. **`ms` iste**; iç model her zaman m/s tutar (mevcut `hizMS` konvansiyonu), gösterimde km/s ve knot türetilir.
- `timezone=auto`: `time` dizileri yerel saatte, yanıtta `utc_offset_seconds` gelir. Alternatif: `timezone=UTC` + ISO8601 parse (zaman dilimi hatasından kaçınmak için **UTC önerilir**, `timeformat=unixtime` ile epoch saniye alınabilir → `Date(timeIntervalSince1970:)`).
- `forecast_days`: 1–16 (varsayılan 7). Watch için 2–3 gün yeterli; iPhone Rüzgar Detayı için 7.
- `past_hours=1` eklenirse son 1 saatin ölçümü de gelir (opsiyonel).

**Yanıt JSON şeması (beklenen):**

```json
{
  "latitude": 41.0, "longitude": 29.0, "elevation": 12.0,
  "generationtime_ms": 0.4, "utc_offset_seconds": 10800,
  "timezone": "Europe/Istanbul", "timezone_abbreviation": "GMT+3",
  "current_units": { "time": "iso8601", "interval": "seconds",
                     "wind_speed_10m": "m/s", "wind_direction_10m": "°",
                     "wind_gusts_10m": "m/s", "temperature_2m": "°C", "is_day": "" },
  "current": { "time": "2026-09-05T14:15", "interval": 900,
               "wind_speed_10m": 6.8, "wind_direction_10m": 35,
               "wind_gusts_10m": 11.2, "temperature_2m": 27.1, "is_day": 1 },
  "hourly_units": { "time": "iso8601", "wind_speed_10m": "m/s",
                    "wind_direction_10m": "°", "wind_gusts_10m": "m/s" },
  "hourly": { "time": ["2026-09-05T00:00", "2026-09-05T01:00", "..."],
              "wind_speed_10m": [3.1, 3.4, "..."],
              "wind_direction_10m": [20, 25, "..."],
              "wind_gusts_10m": [5.0, 5.6, "..."] },
  "daily_units": { "time": "iso8601", "wind_speed_10m_max": "m/s",
                   "wind_gusts_10m_max": "m/s", "wind_direction_10m_dominant": "°" },
  "daily": { "time": ["2026-09-05", "2026-09-06", "2026-09-07"],
             "wind_speed_10m_max": [8.9, 7.2, 5.5],
             "wind_gusts_10m_max": [14.1, 11.8, 9.0],
             "wind_direction_10m_dominant": [30, 45, 200] }
}
```

- `current.interval` = 900 saniye (15 dk'lık anlık ürün).
- `hourly.time` ISO8601 **saniyesiz** (`YYYY-MM-DDTHH:mm`) → `ISO8601DateFormatter` varsayılan ayarı bunu **parse edemez**; ya `timeformat=unixtime` kullan ya da özel `DateFormatter("yyyy-MM-dd'T'HH:mm")`.
- Değerler `null` olabilir (modelin kapsamadığı saatler) → tüm dizi elemanları `Double?`.
- HTTP 400 → `{"error": true, "reason": "..."}`.

**Deniz durumu (opsiyonel, sörf/kite/yelken için, faz 2):**

```
GET https://marine-api.open-meteo.com/v1/marine
  ?latitude=…&longitude=…
  &hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,wind_wave_height
  &daily=wave_height_max,wave_direction_dominant
  &timezone=UTC&timeformat=unixtime&forecast_days=3
```

### 2.4 Watch'a veri akışı ve önbellek

1. **Oturum başlarken (iPhone)** `RuzgarServisi.tahminGetir` → sonuç `BaglantiKoprusu.ruzgarGonder(_:)` ile `updateApplicationContext` (son değer kazanır, pil dostu). Tip: `"tip": "ruzgar"`.
2. **Watch bağımsızsa** (`WCSession.isReachable == false`) ve `WKInterfaceDevice`'ta hücresel/Wi-Fi varsa Watch kendi `URLSession` ile aynı isteği atar. Watch'ta `URLSession` telefona Bluetooth ile bağlıyken de otomatik proxy'lenir; yani çoğu durumda doğrudan istek de çalışır. Sıra: önbellek (≤ 30 dk) → WC context → doğrudan istek.
3. **Yenileme ritmi:** Oturum içinde 15 dakikada bir (Open-Meteo `current` 15 dk çözünürlüklü; daha sık istemek anlamsız ve kotayı harcar). Kullanıcı konumu 2 km'den fazla değişmişse erken yenile.
4. **Güvenlik bandı (UI rengi):** `gust` ≥ 10,8 m/s (Beaufort 6, ~21 kn) → kırmızı; 8,0–10,7 (Bft 5) → sarı; altı → yeşil. Kürek/SUP için Türk Sahil Güvenlik ve genel SUP kılavuzları 15 kn+ (≈7,7 m/s) üzeri rüzgarı acemi için riskli sayar; bandı `SporTuru`'na göre parametrik yap (kite/yelken için üst eşikler farklı).
5. **Kıyıdan uzaklaşan rüzgar (offshore) uyarısı** (faz 2): kıyı yönü bilinmediğinden MVP'de yok; rota başlangıç noktasına göre "rüzgar seni başlangıçtan uzaklaştırıyor" heuristiği sonraya.

---

## 3. Kürek Algılama Algoritması (CoreMotion)

### 3.1 Sensör seçimi

- **API:** `CMMotionManager.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: kuyruk, withHandler:)`. `deviceMotion.userAcceleration` (yerçekimi çıkarılmış, g cinsinden) ve `rotationRate` kullanılır. Ham `accelerometer` yerine deviceMotion tercih: sensör füzyonu yerçekimini ayırır, bilek dönüşlerinden daha az etkilenir.
- **Örnekleme:** `deviceMotionUpdateInterval = 1.0/50.0` (50 Hz). CMMotionManager üst sınırı 100 Hz; kürek hareketi 0,25–2 Hz bandında (15–120 spm) olduğundan 50 Hz fazlasıyla yeterli ve pil dostu. Apple forumlarında 60/80 Hz'in gerçek aralığa tam oturmadığı, 40/100 Hz'in tam oturduğu raporlanmış → 50 Hz sorun çıkarırsa **40 Hz**'e düş.
- **`CMBatchedSensorManager` (800 Hz) kullanma:** Series 8/Ultra+ gerektirir, batch (1 s gecikme) verir; kürek için gereksiz.
- **Arka plan:** `HKWorkoutSession` zaten aktif (`SaglikYoneticisi.canliOturumBaslat`) ve `workout-processing` background mode açık olduğu için ekran kapanınca da deviceMotion akışı devam eder. Apple: arka planda CPU minimum tutulmalı → tüm işleme sensör kuyruğunda, UI'ya **1 Hz** yayın. Forumlarda nadir veri boşlukları raporlanmış; **watchdog**: 3 s veri gelmezse `stopDeviceMotionUpdates` + yeniden başlat.
- **İzin:** Info.plist `NSMotionUsageDescription` (Türkçe metin) — deviceMotion için watchOS'ta gerekli.
- **Uygulanabilir sporlar:** `SporTuru.sup`, `.kano`, `.kurek`. Yelken/yüzme/kite/sörf için sayaç başlatılmaz (`kurekSayimiDestekleniyor == false`).

### 3.2 Sinyal işleme hattı (her örnek için, O(1))

```
1. buyukluk = sqrt(ax² + ay² + az²)            // bilek yönünden bağımsız (hangi bilekte olursa olsun)
2. yavasOrt = EMA(buyukluk, τ = 1.0 s)          // DC / sallanma bileşeni
   yuksekGecis = buyukluk - yavasOrt            // 0 civarında salınan sinyal
3. duzgun = EMA(yuksekGecis, τ = 0.08 s)        // yüksek frekans gürültüsünü kırp (band-pass ≈ 0.16–2 Hz)
4. rms = EMA(duzgun², τ = 5 s) → sqrt           // son 5 s'nin enerji seviyesi
   esik = max(tabanEsik, esikCarpani × rms)     // uyarlanabilir eşik
5. Tepe tespiti (durum makinesi):
   - BEKLE: duzgun > esik olunca → YUKSELIYOR, tepeDeger = duzgun
   - YUKSELIYOR: duzgun > tepeDeger ise tepeDeger/tepeZaman güncelle;
                 duzgun < esik × 0.5 (histerezis) olunca → tepe kesinleşti
   - Refractory: tepeZaman - sonKurekZamani ≥ minAralikSaniye değilse yoksay
   - Kabul: kurekSayisi += 1, halkaTampon.append(tepeZaman), sonTepeGenligi = tepeDeger
6. Kürek hızı: son N=6 tepenin zaman damgası → 60 × (N-1) / (t_son - t_ilk)
   - N < 3 ise: 60 / (t_son - t_öncekiSon) (tek aralıktan kaba tahmin)
   - Yayınlanan değer: EMA(τ = 3 s) ile yumuşatılmış
7. Duraksama: şimdi - sonKurekZamani > 4 s → kurekHiziDakika = 0, tampon temizlenir
```

**Sabitler (spor türüne göre):**

| Parametre | SUP | Kano/Kayak | Kürek | Açıklama |
|---|---|---|---|---|
| `minAralikSaniye` | 0.45 | 0.35 | 0.60 | 133 / 170 / 100 spm üst sınır (refractory) |
| `tabanEsik` (g) | 0.12 | 0.10 | 0.15 | Sakin duruşta dalga sallantısı ~0.05 g'nin üstünde |
| `esikCarpani` | 1.2 | 1.2 | 1.3 | rms'e göre uyarlanabilir |
| `duraksamaSaniye` | 4 | 4 | 5 | Kürek durdu kabulü |

**Spor türüne özgü dikkat noktaları:**
- **SUP** (tek palalı): her çekiş tek belirgin tepe. Taraf değiştirme sırasında (kürek baş üstünden geçerken) 1 ekstra küçük tepe olabilir → histerezis + refractory bunu eler. Yarı-dominant bilekte (üst el vs alt el) genlik farkı olur; büyüklük + uyarlanabilir eşik bunu tolere eder (GoSUP'un "any wrist" iddiası da aynı yaklaşım).
- **Kayak** (çift palalı): sağ ve sol pala dalışı ayrı kürek sayılır (Garmin/Paddlr konvansiyonu). Saat tek bilekte olduğundan bir taraf güçlü, diğer taraf zayıf tepe üretir; `esikCarpani` 1.2 ve `tabanEsik` 0.10 zayıf tepeyi de yakalamak için biraz düşük. Faz 2: güçlü/zayıf tepe ayrımıyla **sağ/sol denge** (stroke balance) hesaplanabilir.
- **Kürek (rowing)**: drive fazı (bacak+sırt) tek büyük tepe, recovery yumuşak; 100 spm üstü fizyolojik değil → refractory 0.6 s.

### 3.3 Türetilmiş metrikler

| Metrik | Hesap | Nerede |
|---|---|---|
| `kurekSayisi` | tepe sayısı | canlı + özet |
| `kurekHiziDakika` | §3.2 adım 6 | canlı |
| `ortalamaKurekHizi` | `kurekSayisi / (aktifSureSaniye/60)` — duraklatılmış süre hariç | özet |
| `maksimumKurekHizi` | 10 s pencerelerde maks | özet |
| `kurekBasinaMesafeMetre` (verimlilik) | son 30 s'de `ΔtoplamMesafeMetre / Δkurek`; oturum için `toplamMesafeMetre / kurekSayisi` | canlı (detay) + özet |
| `kurekGucuEndeksi` (0–100, tahmini) | son 10 tepenin ortalama genliği (g) × kürek hızı normalize; kullanıcının kendi oturum içi maksimumuna göre yüzde. **"Güç" değil "efor endeksi"** olarak etiketle; watt iddiası yapma (harici sensör yok) | detay |

### 3.4 Doğrulama planı

- Saha testi: 10 dk SUP, 10 dk kayak; videodan manuel sayım vs. uygulama. Hedef ±5 % (Garmin/Paddlr kullanıcı raporlarıyla aynı seviye).
- Ayarlar'da "Kürek algılama hassasiyeti: Düşük / Normal / Yüksek" → `esikCarpani` 1.4 / 1.2 / 1.0.
- Debug: geliştirici ayarı ile ham `duzgun` sinyalini oturumla birlikte JSON'a kaydet (ilk beta'da eşik ayarı için).

---

## 4. Watch UI / Bilgi Mimarisi

### 4.1 Gezinme modeli

`WatchTakipView` içindeki `TabView` **dikey sayfa** stiline (`.tabViewStyle(.verticalPage)`, watchOS 10+) çevrilir; Digital Crown ile sayfa geçişi Apple Workout ile birebir aynı alışkanlık. Sıra:

```
[0] Kontroller     (Duraklat / Devam / Bitir / Acil Durum kısayolu)
[1] BİR BAKIŞTA    ← varsayılan açılış sayfası
[2] Kürek Detayı   (sadece kurekSayimiDestekleniyor ise; aksi halde sayfa gizli)
[3] Rüzgar Detayı
```

Reddedilen alternatifler:
- **Apple Fitness halkaları:** hedefsiz metrikler (rüzgar, nabız) halka anlamı taşımaz; sadece kalori için halka düşünülebilir ama tek halka ekranı gereksiz kaplar.
- **ScrollView + uzun liste:** ıslak elle kaydırma güvensiz, "bir bakışta" hedefiyle çelişir.
- **Digital Crown ile büyütme (focus/zoom):** watchOS'ta özel jest desteği zayıf, karmaşık.
- **Yatay `.page`:** mevcut kod bunu kullanıyor ama watchOS 10 sonrası Workout deseni dikey; Crown ile ıslak elde geçiş yapılabiliyor (dokunmadan).

### 4.2 "Bir Bakışta" sayfası — düzen

45 mm ekran referansı (~198×242 pt kullanılabilir alan). 6 sabit veri, 3 satır, dokunmadan okunur:

```
┌──────────────────────────────┐
│  12:34            🏄 SUP     │  ← Süre (monospaced, .title3) + spor ikonu (küçük)
│                              │
│      3.42 km                 │  ← MESAFE (hero, .system(size: 34, .rounded, .bold))
│                              │
│  ♥ 128      🔥 214 kcal      │  ← Nabız (kırmızı)     | Kalori (turuncu)
│  🚣 46/dk    ⚡ 5.8 km/s     │  ← Kürek hızı (mavi)   | Anlık hız (yeşil)
│                              │
│ ┌──────────────────────────┐ │
│ │ ↗ 13 kn  gust 22  ● KD   │ │  ← RÜZGAR ŞERİDİ (renk = güvenlik bandı) → dokun: Rüzgar Detayı
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Kurallar:
- **Her zaman görünür (6):** Mesafe, Süre, Kalori, Nabız, Kürek hızı (veya spor türü desteklemiyorsa **Ortalama hız**), Rüzgar (hız + yön oku + gust).
- **Dokunarak detaya (2 hedef):** Kürek karosu → sayfa [2]; Rüzgar şeridi → sayfa [3]. Diğer karolar dokunmaya tepki vermez (ıslak elde yanlış dokunma riskini azaltır).
- Rüzgar hızı **knot** olarak gösterilir (su sporcusu dili; Windy/Windfinder standardı), Ayarlar'da km/s seçilebilir. Gust her zaman yanında.
- Kalori `SaglikYoneticisi` canlı builder'dan gelir (§5.5'teki delegate eklenmeli — şu an `anlikNabiz` da hiç güncellenmiyor).
- Always-On (`@Environment(\.isLuminanceReduced)`): saniye hanesi gizlenir, kürek hızı "—" olur, rüzgar şeridi rengi kalır.
- Veri eski ise (rüzgar > 45 dk) şeritte küçük "⚠︎ 45 dk önce" alt yazısı.
- Kürek duraksadıysa (4 s) kürek hızı "0" değil "—" gösterilir (yanlış anlamayı önler).
- Ultra Action Button: `WKApplication` "paddle" intent → Duraklat/Devam (Paddle Logger deseni).

### 4.3 Detay sayfaları

**[2] Kürek Detayı**
```
Kürek/dk    46      (büyük)     renk bandı: <35 gri, 35–50 yeşil, 50–65 sarı, >65 turuncu
Toplam      1 284
Ort.        44/dk   Maks 58/dk
Mesafe/kürek 2.7 m  (verimlilik)
Efor endeksi ▮▮▮▮▮▯▯▯ 63
Son 60 s mini çubuk grafik (Swift Charts BarMark, 12 × 5 s)
```

**[3] Rüzgar Detayı** (ScrollView, Crown ile kaydırılır)
```
Şimdi   ↗ 13 kn  (KD, 35°)   gust 22 kn   — 14:15
[ 3 saatlik şerit: +1s 14 ↗  +2s 16 ↗  +3s 18 ↑  +6s 20 ↑ ]   (Windy.app 3/6/9 deseni)
Bugün   maks 17 kn  gust 27  baskın KD
Yarın   maks 12 kn  gust 19  baskın G
Pazar   maks  9 kn  gust 14  baskın GB
Rüzgar verisi: Open-Meteo.com (CC BY 4.0)
```
Yön: pusula kısaltması Türkçe (K, KD, D, GD, G, GB, B, KB) + ok. Ok, **rüzgarın estiği yönü** (meteorolojik "from") değil, hareket ettiği yönü ("to") gösterir; yazıda "KD'den" ifadesi kullanılır (Windy ok konvansiyonu: ok = akış yönü).

### 4.4 Ekran haritası (Watch)

```
WatchBaslangicView
 ├─ (Başlat) → WatchTakipView [dikey TabView]
 │     ├─ WatchKontrolSayfasi
 │     ├─ WatchBirBakistaView   ── dokun kürek ──▶ WatchKurekDetayView
 │     │                        ── dokun rüzgar ─▶ WatchRuzgarDetayView
 │     ├─ WatchKurekDetayView
 │     └─ WatchRuzgarDetayView
 │           (Bitir) → WatchOzetView (sheet) [mesafe, süre, kalori, kürek sayısı, ort. kürek/dk, rüzgar]
 ├─ (Rüzgar) → WatchRuzgarDetayView   ← oturum dışında da ulaşılabilir (planlama)
 └─ (Acil Durum) → WatchAcilDurumView
```

Başlangıç ekranına oturum öncesi **rüzgar önizleme satırı** eklenir (Başlat butonunun üstünde: "↗ 13 kn · gust 22 · KD"). Bu, "çıkmadan önce rüzgara bak" senaryosu; Paddle Logger'ın planlama özelliğinin Watch karşılığı.

### 4.5 iPhone tarafı (kısa)

- `RotaTakipView.istatistikGrid`: 2×2'den 3×2'ye (Kalori, Kürek/dk eklenir); harita üstüne rüzgar oku overlay'i.
- `OturumOzetiView` / `OturumDetayView`: "Kürek" bölümü (toplam, ort/maks, m/kürek) ve "Koşullar" bölümü (başlangıç/bitiş rüzgarı).
- Yeni sekme gerekmez; Rüzgar tahmini `RotaTakipView` içinde haritanın altında açılır panel (7 gün).
- GPX dışa aktarımda `<extensions>` içine `kurekSayisi`/`ortalamaKurekHizi` eklenebilir (Strava okumaz, zarar da vermez).

---

## 5. Swift Arayüz Sözleşmesi

Konvansiyon: mevcut kodla tutarlı — Türkçe camelCase, ölçü birimi isimde (`MS`, `Metre`, `Derece`, `Saniye`, `Kcal`), completion handler parametre adı `tamamlaninca:`, `@Published private(set)`, `static let shared`, `Codable` modeller, `ObservableObject` servisler, `DispatchQueue.main.async` ile ana kuyruğa dönüş. Sadece imzalar; gövde yok.

### 5.1 Modeller — `Shared/Models/RuzgarBilgisi.swift`

```swift
import Foundation
import CoreLocation

/// Belirli bir an ve konum için gözlenen/tahmin edilen rüzgar.
struct RuzgarBilgisi: Codable, Equatable {
    var hizMS: Double            // metre/saniye
    var yonDerece: Double        // 0-360, meteorolojik: rüzgarın GELDİĞİ yön
    var gustMS: Double?          // hamle (gust) hızı, metre/saniye; kaynak vermezse nil
    var sicaklikC: Double?       // opsiyonel hava sıcaklığı
    var zaman: Date              // verinin geçerli olduğu an
    var alinmaZamani: Date       // cihazın veriyi çektiği an (eskilik kontrolü için)
    var kaynak: RuzgarKaynagi

    init(hizMS: Double, yonDerece: Double, gustMS: Double?, sicaklikC: Double? = nil,
         zaman: Date, alinmaZamani: Date = Date(), kaynak: RuzgarKaynagi)

    // Türetilmiş görüntü değerleri
    var hizKnot: Double { get }            // hizMS * 1.943844
    var hizKmS: Double { get }             // hizMS * 3.6
    var gustKnot: Double? { get }
    var yonKisaltma: String { get }        // "K","KD","D","GD","G","GB","B","KB"
    var yonOkuDerece: Double { get }       // (yonDerece + 180).truncatingRemainder(dividingBy: 360) — okun gösterdiği akış yönü
    var beaufort: Int { get }              // 0-12
    var eskiMi: Bool { get }               // Date().timeIntervalSince(alinmaZamani) > 45*60
    func guvenlikBandi(sporTuru: SporTuru) -> RuzgarGuvenlikBandi
}

enum RuzgarKaynagi: String, Codable {
    case openMeteo = "open_meteo"
    case weatherKit = "weather_kit"
    case onbellek = "onbellek"
    case manuel = "manuel"
}

enum RuzgarGuvenlikBandi: String, Codable {
    case sakin      // yeşil
    case dikkat     // sarı
    case tehlikeli  // kırmızı
}
```

### 5.2 Modeller — `Shared/Models/RuzgarTahmini.swift`

```swift
import Foundation
import CoreLocation

/// Saatlik tahmin dizisinin tek elemanı.
struct RuzgarTahmini: Codable, Identifiable, Equatable {
    var id: Date { zaman }
    var zaman: Date              // saat başı
    var hizMS: Double
    var yonDerece: Double
    var gustMS: Double?

    var hizKnot: Double { get }
    var gustKnot: Double? { get }
    var yonKisaltma: String { get }
    var ruzgarBilgisi: RuzgarBilgisi { get }   // RuzgarBilgisi'ne dönüştürme (aynı hesaplar için)
}

/// Günlük tahmin dizisinin tek elemanı.
struct GunlukRuzgarTahmini: Codable, Identifiable, Equatable {
    var id: Date { gun }
    var gun: Date                // günün 00:00'ı (yerel)
    var maksimumHizMS: Double
    var maksimumGustMS: Double?
    var baskinYonDerece: Double

    var maksimumHizKnot: Double { get }
    var maksimumGustKnot: Double? { get }
    var baskinYonKisaltma: String { get }
}

/// Bir konum için tek istekte alınan tam paket (anlık + saatlik + günlük).
struct RuzgarTahminSeti: Codable, Equatable {
    var enlem: Double
    var boylam: Double
    var uretimZamani: Date                   // sunucunun tahmini ürettiği/istemcinin aldığı an
    var anlik: RuzgarBilgisi?
    var saatlik: [RuzgarTahmini]             // zamana göre artan
    var gunluk: [GunlukRuzgarTahmini]        // güne göre artan
    var kaynak: RuzgarKaynagi

    /// Verilen andan sonraki ilk `adet` saatlik tahmin (Watch "3 saatlik şerit" için).
    func yaklasanSaatler(_ adet: Int, itibaren: Date = Date()) -> [RuzgarTahmini]
    /// 30 dk'dan eskiyse false.
    var guncelMi: Bool { get }
    /// Konum bu setin konumundan `metre`den daha uzaksa false.
    func kapsiyorMu(_ konum: CLLocation, metre: Double = 2_000) -> Bool
}
```

### 5.3 Servis — `Shared/Services/RuzgarServisi.swift`

```swift
import Foundation
import CoreLocation
import Combine

enum RuzgarHatasi: LocalizedError {
    case agYok
    case sunucuHatasi(kod: Int)
    case gecersizYanit
    case konumYok
    case kotaAsildi
    var errorDescription: String? { get }   // Türkçe mesajlar
}

/// Veri sağlayıcı soyutlaması; Open-Meteo bugün, WeatherKit yarın.
protocol RuzgarSaglayici {
    var kaynak: RuzgarKaynagi { get }
    /// Tek istekte anlık + saatlik + günlük getirir.
    func tahminGetir(
        enlem: Double,
        boylam: Double,
        saatlikSaat: Int,          // kaç saatlik ileri (örn. 48)
        gunlukGun: Int,            // kaç günlük (1-16)
        tamamlaninca: @escaping (Result<RuzgarTahminSeti, RuzgarHatasi>) -> Void
    )
}

/// Open-Meteo uygulaması (anahtarsız). Endpoint ve alan adları STRATEGY.md §2.3.
final class OpenMeteoRuzgarSaglayici: RuzgarSaglayici {
    init(oturum: URLSession = .shared)
    var kaynak: RuzgarKaynagi { .openMeteo }
    func tahminGetir(enlem: Double, boylam: Double, saatlikSaat: Int, gunlukGun: Int,
                     tamamlaninca: @escaping (Result<RuzgarTahminSeti, RuzgarHatasi>) -> Void)

    // İç kullanım — test edilebilirlik için internal:
    static func istekURL(enlem: Double, boylam: Double, gunlukGun: Int) -> URL
    static func ayristir(_ veri: Data, alinmaZamani: Date) throws -> RuzgarTahminSeti
}

/// iPhone ve Watch'ta ortak; önbellek + sağlayıcı + yayın.
final class RuzgarServisi: ObservableObject {
    static let shared: RuzgarServisi

    @Published private(set) var anlikRuzgar: RuzgarBilgisi?
    @Published private(set) var tahminSeti: RuzgarTahminSeti?
    @Published private(set) var yukleniyor: Bool
    @Published private(set) var sonHata: RuzgarHatasi?
    @Published private(set) var sonGuncelleme: Date?

    /// Varsayılan: OpenMeteoRuzgarSaglayici(). Test/geçiş için enjekte edilebilir.
    init(saglayici: RuzgarSaglayici = OpenMeteoRuzgarSaglayici())

    /// Önbellek güncelse (≤30 dk ve ≤2 km) ağ isteği atmaz; aksi halde çeker ve yayınlar.
    func guncelle(konum: CLLocation, zorla: Bool = false,
                  tamamlaninca: @escaping (Result<RuzgarTahminSeti, RuzgarHatasi>) -> Void)

    /// Sadece anlık değeri isteyen çağıranlar için kısayol (guncelle'yi sarar).
    func anlikRuzgarGetir(konum: CLLocation,
                          tamamlaninca: @escaping (Result<RuzgarBilgisi, RuzgarHatasi>) -> Void)

    /// Karşı cihazdan (WatchConnectivity) gelen seti kabul eder; daha yeniyse yayınlar.
    func disKaynaktanUygula(_ set: RuzgarTahminSeti)

    /// Oturum boyunca 15 dk'da bir `guncelle` çağıran zamanlayıcı.
    func periyodikGuncellemeyiBaslat(konumSaglayici: @escaping () -> CLLocation?)
    func periyodikGuncellemeyiDurdur()

    /// Diske (UserDefaults/JSON) son set; uygulama açılışında okunur.
    func onbellegiKaydet()
    func onbellegiYukle()
}
```

`BaglantiKoprusu` eklemeleri:

```swift
extension BaglantiKoprusu {
    /// Tahmin setini karşı cihaza iter (updateApplicationContext; son değer kazanır).
    func ruzgarGonder(_ set: RuzgarTahminSeti)
    /// Karşı cihazdan rüzgar seti geldiğinde tetiklenir.
    var ruzgarAlindi: ((RuzgarTahminSeti) -> Void)? { get set }
    // isle(mesaj:) içinde yeni tip: "ruzgar" → veri: Data (JSON RuzgarTahminSeti)
    // Ek WCSessionDelegate: session(_:didReceiveApplicationContext:)
}
```

### 5.4 Servis — `Shared/Services/KurekSayaci.swift` (watchOS; iOS'ta boş stub)

```swift
import Foundation
import Combine
#if os(watchOS)
import CoreMotion
#endif

/// Spor türüne göre algoritma sabitleri (STRATEGY.md §3.2 tablosu).
struct KurekAlgilamaAyari: Equatable {
    var minAralikSaniye: TimeInterval
    var tabanEsikG: Double
    var esikCarpani: Double
    var duraksamaSaniye: TimeInterval
    var ornekHz: Double                       // 50

    static func varsayilan(_ sporTuru: SporTuru) -> KurekAlgilamaAyari
    static let sup: KurekAlgilamaAyari
    static let kano: KurekAlgilamaAyari
    static let kurek: KurekAlgilamaAyari
}

enum KurekHassasiyeti: String, Codable, CaseIterable {   // Ayarlar'da seçilir
    case dusuk, normal, yuksek
    var esikCarpani: Double { get }           // 1.4 / 1.2 / 1.0
}

/// Bilek ivmeölçerinden kürek çekişlerini sayar; 1 Hz'de ana kuyruğa yayınlar.
final class KurekSayaci: ObservableObject {
    @Published private(set) var kurekSayisi: Int
    @Published private(set) var kurekHiziDakika: Double          // anlık (yumuşatılmış) stroke rate; duraksamada 0
    @Published private(set) var ortalamaKurekHizi: Double?       // aktif süreye göre
    @Published private(set) var maksimumKurekHizi: Double?
    @Published private(set) var kurekBasinaMesafeMetre: Double?  // son 30 s penceresi
    @Published private(set) var kurekGucuEndeksi: Double?        // 0-100, "efor endeksi"
    @Published private(set) var sonKurekZamani: Date?
    @Published private(set) var son60SaniyeHizlari: [Double]     // 12 × 5 s kova, mini grafik için
    @Published private(set) var calisiyor: Bool
    @Published private(set) var sensorHatasi: String?

    init(ayar: KurekAlgilamaAyari = .sup)

    var ayar: KurekAlgilamaAyari { get set }                     // hassasiyet değişince güncellenir
    var sporTuru: SporTuru { get }

    /// deviceMotion akışını başlatır; sporTuru desteklemiyorsa no-op ve calisiyor=false.
    func basla(sporTuru: SporTuru)
    func duraklat()        // sayım durur, birikim korunur
    func devamEt()
    func durdur()          // akışı kapatır, değerler korunur (özet için)
    func sifirla()

    /// AntrenmanYoneticisi her GPS noktasında çağırır; mesafe/kürek hesabı için.
    func mesafeGuncelle(toplamMesafeMetre: Double)

    /// Oturum bittiğinde RotaOturumu'na yazılacak özet.
    var ozet: KurekOzeti { get }
}

struct KurekOzeti: Codable, Equatable {
    var kurekSayisi: Int
    var ortalamaKurekHizi: Double?
    var maksimumKurekHizi: Double?
    var kurekBasinaMesafeMetre: Double?
    var ortalamaGucEndeksi: Double?
}

extension SporTuru {
    /// sup, kano, kurek → true; diğerleri false.
    var kurekSayimiDestekleniyor: Bool { get }
}
```

### 5.5 `RotaOturumu` eklemeleri — `Shared/Models/RotaOturumu.swift`

```swift
struct RotaOturumu: Codable, Identifiable {
    // ... mevcut alanlar değişmez ...

    // YENİ — kürek performansı (kürek sayımı desteklenmeyen sporlarda 0 / nil)
    var kurekSayisi: Int                          // varsayılan 0
    var ortalamaKurekHizi: Double?                // kürek/dk
    var maksimumKurekHizi: Double?
    var kurekBasinaMesafeMetre: Double?
    var ortalamaGucEndeksi: Double?

    // YENİ — koşullar
    var baslangicRuzgari: RuzgarBilgisi?          // basla() anında
    var bitisRuzgari: RuzgarBilgisi?              // bitir() anında
    var maksimumGustMS: Double?                   // oturum boyunca görülen en yüksek gust

    // YENİ — canlı kalori/nabız (HealthKit builder'dan; kaydedenCihaz == "Apple Watch")
    var maksimumKalpAtisi: Double?

    // Türetilmiş
    var ruzgarOzeti: String? { get }              // "KD 13 kn, gust 22" (özet satırı için)
    var kurekVerimlilikMetreBasi: Double? { get } // toplamMesafeMetre / kurekSayisi (kurekSayisi>0)

    mutating func kurekOzetiUygula(_ ozet: KurekOzeti)
    mutating func ruzgarGuncelle(_ bilgi: RuzgarBilgisi)   // maksimumGustMS'i günceller, bitisRuzgari'nı set eder
}

// GERİYE DÖNÜK UYUMLULUK — zorunlu:
// `oturumlar.json` içindeki eski kayıtlar yeni alanları içermez. `init(from decoder:)`
// elle yazılır ve yeni alanlar `decodeIfPresent(...) ?? varsayılan` ile okunur; aksi halde
// OturumDeposu.oku() tüm geçmişi sessizce boş döndürür.
```

### 5.6 `AntrenmanYoneticisi` eklemeleri

```swift
final class AntrenmanYoneticisi: ObservableObject {
    // ... mevcut ...
    @Published private(set) var anlikKaloriKcal: Double?      // HealthKit canlı builder'dan
    @Published private(set) var anlikHizMS: Double?           // son GPS noktası
    @Published private(set) var anlikRuzgar: RuzgarBilgisi?   // RuzgarServisi'nden köprülenir

    let kurekSayaci: KurekSayaci                              // Watch'ta gerçek, iOS'ta stub
    let ruzgarServisi: RuzgarServisi

    // basla(sporTuru:) içinde: kurekSayaci.basla, ruzgarServisi.periyodikGuncellemeyiBaslat,
    //   ilk ruzgar → aktifOturum.baslangicRuzgari, (iOS) koprusu.ruzgarGonder
    // duraklat/devamEt: kurekSayaci.duraklat/devamEt
    // bitir: kurekSayaci.durdur → oturum.kurekOzetiUygula(kurekSayaci.ozet); bitisRuzgari
    // noktaIsle: kurekSayaci.mesafeGuncelle(toplamMesafeMetre:), anlikHizMS
}
```

### 5.7 `SaglikYoneticisi` — canlı veri callback'i (eksik, eklenmeli)

Mevcut `SaglikYoneticisi` `HKLiveWorkoutBuilderDelegate` uygulamıyor; bu yüzden Watch'ta `anlikNabiz` hiç güncellenmiyor ve kalori sadece bitişte alınıyor. Sözleşme:

```swift
#if os(watchOS)
extension SaglikYoneticisi: HKLiveWorkoutBuilderDelegate {
    /// Nabız (count/min) ve aktif kalori (kcal) her değiştiğinde ana kuyrukta tetiklenir.
    var canliVeriGuncellendi: ((_ nabiz: Double?, _ aktifKaloriKcal: Double?) -> Void)? { get set }
    // workoutBuilder(_:didCollectDataOf:) içinde .heartRate ve .activeEnergyBurned
    // için statistics(for:) → mostRecentQuantity / sumQuantity okunur.
    // HKLiveWorkoutDataSource'a .heartRate ve .activeEnergyBurned enableCollection eklenir.
}
#endif
```

### 5.8 Watch görünüm bileşenleri (isimler; ajanlar arası referans)

| Dosya | Sorumluluk |
|---|---|
| `WatchApp/Views/WatchTakipView.swift` | Dikey `TabView` konteyneri, `@State seciliSayfa = 1` |
| `WatchApp/Views/WatchKontrolSayfasi.swift` | Duraklat/Devam/Bitir (+ Acil Durum linki) |
| `WatchApp/Views/WatchBirBakistaView.swift` | §4.2 düzeni; `MetrikKarosu(baslik:deger:birim:renk:simge:)` yardımcı view |
| `WatchApp/Views/WatchKurekDetayView.swift` | §4.3 |
| `WatchApp/Views/WatchRuzgarDetayView.swift` | §4.3; oturum dışından da açılır |
| `WatchApp/Views/RuzgarSeridi.swift` | Ok + hız + gust + renk bandı; Bir Bakışta ve Başlangıç ekranında ortak |
| `Shared/Views/RuzgarOku.swift` | `yonOkuDerece` ile döndürülmüş `arrow.up` — iOS harita overlay'i de kullanır |

Ortak biçimlendirme (`Shared/Helpers/Bicimlendirici.swift`):
```swift
enum Bicimlendirici {
    static func sure(_ saniye: TimeInterval) -> String          // "12:34" / "1:02:03" (RotaTakipView'daki kopyayı da buraya taşı)
    static func mesafeKm(_ metre: Double) -> String            // "3.42 km"
    static func hizKmS(_ ms: Double) -> String                 // "5.8 km/s"
    static func ruzgarKnot(_ ms: Double) -> String             // "13 kn"
    static func kalori(_ kcal: Double?) -> String              // "214 kcal" / "—"
    static func kurekHizi(_ dakika: Double) -> String          // "46/dk" / "—"
}
```

---

## 6. Uygulama Sırası ve Riskler

1. **Model + Codable geriye uyumluluk** (§5.5) — diğer her şey buna bağlı; ilk PR.
2. **SaglikYoneticisi canlı delegate** (§5.7) — kalori/nabız olmadan Bir Bakışta yarım kalır.
3. **RuzgarServisi + OpenMeteo** — bağımsız, unit test edilebilir (`ayristir` için sabit JSON fixture).
4. **KurekSayaci** — bağımsız; simülatörde test edilemez, gerçek Watch gerekir. Sinyal kaydı debug ayarı ilk beta'ya dahil.
5. **Watch UI** — 1–4 hazır olunca; `MetrikKarosu` önceden mock veriyle yazılabilir.
6. **iPhone UI** — en son.

Riskler: (a) Open-Meteo "ticari" yorumu → abonelik planı bütçesi; (b) deviceMotion arka planda seyrek veri boşlukları → watchdog; (c) `.verticalPage` watchOS 10+ gerektirir → deployment target watchOS 10 (mevcut proje zaten `NavigationStack` ve watchOS 9+ kullanıyor, 10'a çekmek makul); (d) Always-On modda 1 Hz yayın pil etkisi → `isLuminanceReduced`'da yayın 0,2 Hz'e düşürülür.

---

## 7. Kaynaklar

Rekabet
- Paddle Logger — App Store: https://apps.apple.com/us/app/paddle-logger-sup-kayaking/id955311911 · Watch kılavuzu: https://paddle-logger-ltd.helpscoutdocs.com/article/11-using-your-apple-watch · TotalSUP inceleme: https://www.totalsup.com/news/paddle-logger-activity-tracker-apple-watch-david-walker/
- Paddlr — https://apps.apple.com/us/app/paddlr/id1341137689 · https://www.paddlr.fit/
- SUP Tracker: Paddle GPS — https://apps.apple.com/us/app/sup-tracker-paddle-gps/id1473875023
- GoSUP — https://apps.apple.com/us/app/gosup-paddle-and-watersport/id1479884746
- Paddlz — https://apps.apple.com/us/app/paddlz-paddle-fitness-tracker/id1159109484
- Waterspeed — https://apps.apple.com/us/app/waterspeed-track-watersports/id1234093389 · https://www.waterspeedapp.com/integrations/apple-watch
- Kayak Tracker — https://kayaktracker.app/
- Dawn Patrol — https://www.dawnpatrol.cloud/app · https://apps.apple.com/us/app/dawn-patrol/id1161014179 · Surfd inceleme: https://surfd.com/2019/05/review-dawn-patrol-app-for-apple-watch/
- Surfline Sessions — https://support.surfline.com/hc/en-us/articles/4412099585435 · Engadget: https://www.engadget.com/2019-07-31-surfline-sessions-apple-watch-hands-on.html
- Windy.com Watch — https://community.windy.com/topic/19303/windy-apple-watch-complete-guide · https://community.windy.com/topic/21254/apple-watch-windy-wind-complication
- Windy.app Watch — https://windy.app/guide/guide-for-apple-watch.html · https://windy.app/news/widgets-for-apple-watch.html
- Windfinder — https://www.windfinder.com/apps · https://apps.apple.com/us/app/windfinder-wind-weather-map/id336829635
- PredictWind — https://www.predictwind.com/apps
- Strava Watch yeniden tasarım — https://press.strava.com/articles/strava-launches-redesigned-apple-watch-app-now-with-live-segments · https://support.strava.com/hc/en-us/articles/115000161184-Strava-Apple-Watch-App
- WHOOP dashboard — https://www.wareable.com/apple/turn-your-apple-watch-into-whoop · https://9to5mac.com/2026/05/08/apple-watch-vs-whoop-heres-what-i-learned-after-60-days-wearing-both-video/
- Garmin paddle alanları — https://forums.garmin.com/outdoor-recreation/outdoor-recreation/f/fenix-7-series/294652/kayak-stroke-count-fields · https://apps.garmin.com/apps/d6782c85-33f6-447b-b352-7a61fa905353
- Apple Workout görünümleri — https://support.apple.com/guide/watch/customize-workout-views-apd6b0679060/watchos · Paddling GPS eksikliği: https://discussions.apple.com/thread/255436528
- SUP stroke rate — https://paddlemonster.com/advanced-paddler/stroke-rate-and-gears-in-sup-paddling/ · http://larrycain.blogspot.com/2013/03/i-thought-i-would-take-break-from.html · https://supboardermag.com/2015/12/04/sup-cadence-what-is-it-paddle-stroke-paddlboaring/ · https://supboardermag.com/2016/07/22/sup-technical-how-to-find-out-what-race-paddle-is-fastest-for-yo/

Rüzgar API
- Open-Meteo — https://open-meteo.com/en/docs · Marine: https://open-meteo.com/en/docs/marine-weather-api · Terms/Pricing: https://open-meteo.com/en/terms · https://open-meteo.com/en/pricing · Kaynak (değişken adları): https://github.com/open-meteo/open-meteo (openapi/forecast.yml, openapi/marine.yml, Sources/App/Controllers/VariableDaily.swift)
- WeatherKit — https://developer.apple.com/weatherkit/get-started/ (fiyat/atıf/platform) · https://developer.apple.com/documentation/weatherkit/wind · Monstarlab karşılaştırma: https://engineering.monstar-lab.com/en/post/2023/05/01/iOS-WeatherKit/

CoreMotion
- WWDC23 "What's new in Core Motion" (100 Hz sınırı, CMBatchedSensorManager 800/200 Hz, workout şartı, swing tespiti) — https://developer.apple.com/videos/play/wwdc2023/10179/
- WWDC16 "Health and Fitness with Core Motion" — https://asciiwwdc.com/2016/sessions/713
- CMMotionManager — https://developer.apple.com/documentation/coremotion/cmmotionmanager · updateInterval doğruluğu: https://developer.apple.com/forums/thread/122765 · Arka plan boşlukları: https://developer.apple.com/forums/thread/704826 · https://developer.apple.com/forums/thread/723786
- Apple Watch ivmeölçer eksen tanımı — https://9to5mac.com/2024/09/16/apple-details-how-apple-watch-accelerometer-based-sleep-apnea-feature-works/
