const MARKER = import.meta.env.VITE_TRAVELPAYOUTS_MARKER || '516181'

// Kiwi.com uses English city-country slugs
const KIWI_SLUGS = {
  IST: 'istanbul-turkey', SAW: 'istanbul-turkey', ADB: 'izmir-turkey',
  AYT: 'antalya-turkey', ESB: 'ankara-turkey', ADA: 'adana-turkey',
  DLM: 'dalaman-turkey', BJV: 'bodrum-turkey', NAV: 'nevsehir-turkey',
  GZP: 'trabzon-turkey', TZX: 'trabzon-turkey', GZT: 'gaziantep-turkey',
  VAN: 'van-turkey', ERZ: 'erzurum-turkey', SZF: 'samsun-turkey',
  IZM: 'izmir-turkey', ANK: 'ankara-turkey', COV: 'konya-turkey',
  DIY: 'diyarbakir-turkey',
  // Rusya
  MOW: 'moscow-russia', LED: 'saint-petersburg-russia', KRR: 'krasnodar-russia',
  AER: 'sochi-russia', KZN: 'kazan-russia', SVX: 'yekaterinburg-russia',
  RMO: 'rostov-on-don-russia',
  // Avrupa
  PAR: 'paris-france', CDG: 'paris-france', BCN: 'barcelona-spain',
  ROM: 'rome-italy', FCO: 'rome-italy', ATH: 'athens-greece',
  BUD: 'budapest-hungary', PRG: 'prague-czechia', VIE: 'vienna-austria',
  BER: 'berlin-germany', AMS: 'amsterdam-netherlands',
  LHR: 'london-united-kingdom', LON: 'london-united-kingdom',
  LIS: 'lisbon-portugal', MAD: 'madrid-spain', MXP: 'milan-italy',
  MUC: 'munich-germany', DUB: 'dublin-ireland', CPH: 'copenhagen-denmark',
  BRU: 'brussels-belgium', WAW: 'warsaw-poland', ZRH: 'zurich-switzerland',
  BEG: 'belgrade-serbia', TGD: 'podgorica-montenegro',
  // Kafkasya / Orta Doğu
  TBS: 'tbilisi-georgia', BAK: 'baku-azerbaijan', GYD: 'baku-azerbaijan',
  DXB: 'dubai-united-arab-emirates', DOH: 'doha-qatar',
  JED: 'jeddah-saudi-arabia', MED: 'medina-saudi-arabia',
  // Afrika
  CAI: 'cairo-egypt', SSH: 'sharm-el-sheikh-egypt',
  CMN: 'casablanca-morocco', TUN: 'tunis-tunisia',
  // Uzak
  BKK: 'bangkok-thailand', HND: 'tokyo-japan', ICN: 'seoul-south-korea',
  SIN: 'singapore-singapore', JFK: 'new-york-united-states',
}

/**
 * Tarih string'inden gün ve ay çıkarır
 * @param {string} dateStr - "2026-05-10" formatında tarih
 * @returns {{ dd: string, mm: string, yy: string, full: string }}
 */
function parseTarih(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return { dd: d, mm: m, yy: y.slice(2), full: dateStr }
}

/**
 * Platform bazında affiliate URL'i oluşturur
 */
export function generateAffiliateUrl(platform, origin, destination, departDate, returnDate) {
  const dep = parseTarih(departDate)
  const ret = parseTarih(returnDate)

  if (!dep) return null

  switch (platform) {
    case 'aviasales': {
      // Format: /search/{ORIGIN}{DDMM}{DEST}{DDMM}1?marker=...
      const retPart = ret ? `${destination}${ret.dd}${ret.mm}` : destination
      return `https://www.aviasales.com/search/${origin}${dep.dd}${dep.mm}${retPart}1?marker=${MARKER}`
    }

    case 'skyscanner': {
      // Format: /transport/flights/{origin}/{dest}/{YYMMDD}/{YYMMDD}/
      const depCode = `${dep.yy}${dep.mm}${dep.dd}`
      const retCode = ret ? `${ret.yy}${ret.mm}${ret.dd}` : ''
      const retPath = retCode ? `/${retCode}` : ''
      return `https://www.skyscanner.com.tr/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${depCode}${retPath}/?adultsv2=1`
    }

    case 'kiwi': {
      // Format: /en/search/tiles/{origin-slug}/{dest-slug}/{YYYY-MM-DD}/{YYYY-MM-DD}
      const oSlug = KIWI_SLUGS[origin] || origin.toLowerCase()
      const dSlug = KIWI_SLUGS[destination] || destination.toLowerCase()
      const retPath = ret ? `/${ret.full}` : ''
      return `https://www.kiwi.com/en/search/tiles/${oSlug}/${dSlug}/${dep.full}${retPath}`
    }

    default:
      return null
  }
}

/**
 * Tüm platformların linklerini tek seferde üretir
 */
export function generateAllLinks(origin, destination, departDate, returnDate) {
  return {
    aviasales: generateAffiliateUrl('aviasales', origin, destination, departDate, returnDate),
    skyscanner: generateAffiliateUrl('skyscanner', origin, destination, departDate, returnDate),
    kiwi: generateAffiliateUrl('kiwi', origin, destination, departDate, returnDate),
  }
}
