import Foundation
import CoreLocation

/// Rota kaydı sırasında toplanan tek bir GPS örneği.
struct GPSNoktasi: Codable, Identifiable, Equatable {
    let id: UUID
    let enlem: Double
    let boylam: Double
    let yukseklikMetre: Double
    let hizMS: Double      // metre/saniye, negatifse geçersiz
    let yon: Double        // derece, 0-360
    let zaman: Date

    init(konum: CLLocation) {
        self.id = UUID()
        self.enlem = konum.coordinate.latitude
        self.boylam = konum.coordinate.longitude
        self.yukseklikMetre = konum.altitude
        self.hizMS = max(konum.speed, 0)
        self.yon = max(konum.course, 0)
        self.zaman = konum.timestamp
    }

    init(id: UUID = UUID(), enlem: Double, boylam: Double, yukseklikMetre: Double, hizMS: Double, yon: Double, zaman: Date) {
        self.id = id
        self.enlem = enlem
        self.boylam = boylam
        self.yukseklikMetre = yukseklikMetre
        self.hizMS = hizMS
        self.yon = yon
        self.zaman = zaman
    }

    var koordinat: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: enlem, longitude: boylam)
    }

    var clLocation: CLLocation {
        CLLocation(
            coordinate: koordinat,
            altitude: yukseklikMetre,
            horizontalAccuracy: 5,
            verticalAccuracy: 5,
            course: yon,
            speed: hizMS,
            timestamp: zaman
        )
    }

    /// Google Maps üzerinde bu noktayı açan bağlantı (acil durumda konum paylaşımı için).
    var haritaLinki: String {
        "https://maps.google.com/?q=\(enlem),\(boylam)"
    }
}
