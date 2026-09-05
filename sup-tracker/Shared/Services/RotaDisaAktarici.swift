import Foundation

/// RotaOturumu'nu GPX 1.1 formatına çevirir (Strava dahil hemen hemen her platform GPX kabul eder).
enum RotaDisaAktarici {
    private static let tarihBicimi: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static func gpxOlustur(_ oturum: RotaOturumu) -> String {
        var gpx = """
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="Kacamak SUP Takip" xmlns="http://www.topografix.com/GPX/1/1">
          <metadata>
            <name>\(oturum.sporTuru.adi) - \(tarihBicimi.string(from: oturum.baslangicZamani))</name>
            <time>\(tarihBicimi.string(from: oturum.baslangicZamani))</time>
          </metadata>
          <trk>
            <name>\(oturum.sporTuru.adi)</name>
            <type>\(oturum.sporTuru.stravaTuru)</type>
            <trkseg>

        """

        for nokta in oturum.noktalar {
            gpx += """
                  <trkpt lat="\(nokta.enlem)" lon="\(nokta.boylam)">
                    <ele>\(nokta.yukseklikMetre)</ele>
                    <time>\(tarihBicimi.string(from: nokta.zaman))</time>
                  </trkpt>

            """
        }

        gpx += """
            </trkseg>
          </trk>
        </gpx>
        """
        return gpx
    }

    static func gpxDosyasiOlustur(_ oturum: RotaOturumu) -> URL? {
        let gpx = gpxOlustur(oturum)
        let dosyaAdi = "rota-\(oturum.id.uuidString).gpx"
        let geciciURL = FileManager.default.temporaryDirectory.appendingPathComponent(dosyaAdi)
        do {
            try gpx.write(to: geciciURL, atomically: true, encoding: .utf8)
            return geciciURL
        } catch {
            return nil
        }
    }
}
