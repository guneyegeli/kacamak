const MARKER = import.meta.env.VITE_TRAVELPAYOUTS_MARKER || '518734'

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
  // Balkanlar
  OTP: 'bucharest-romania', SOF: 'sofia-bulgaria', BEG: 'belgrade-serbia',
  SKP: 'skopje-north-macedonia', TIA: 'tirana-albania', ZAG: 'zagreb-croatia',
  SJJ: 'sarajevo-bosnia-and-herzegovina',
  // Uzak
  NRT: 'tokyo-japan', KUL: 'kuala-lumpur-malaysia', MLE: 'male-maldives',
  HRG: 'hurghada-egypt', SSH: 'sharm-el-sheikh-egypt',
  HEL: 'helsinki-finland', ARN: 'stockholm-sweden', OSL: 'oslo-norway',
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
 * Zaten Türkçe desteği olan siteler — Google Translate proxy kullanma
 */
const TURKCE_DESTEKLI = [
  'aviasales.com',
  'skyscanner.com.tr',
  'hotellook.com',
  'kiwi.com',
]

/**
 * URL'in Türkçe destekli bir sitede olup olmadığını kontrol eder
 */
function turkceSiteMi(url) {
  if (!url) return false
  try {
    const hostname = new URL(url).hostname
    return TURKCE_DESTEKLI.some(site => hostname.includes(site))
  } catch {
    return false
  }
}

/**
 * İngilizce siteleri Google Translate proxy ile Türkçeye çevirir.
 * Türkçe destekli siteler direkt açılır.
 */
function googleTranslateWrap(url) {
  if (!url || turkceSiteMi(url)) return url
  return `https://translate.google.com/translate?sl=auto&tl=tr&u=${encodeURIComponent(url)}`
}

/**
 * Platform bazında affiliate URL'i oluşturur
 */
export function generateAffiliateUrl(platform, origin, destination, departDate, returnDate, yolcu) {
  const dep = parseTarih(departDate)
  const ret = parseTarih(returnDate)

  if (!dep) return null

  switch (platform) {
    case 'aviasales': {
      // Format: /search/{ORIGIN}{DDMM}{DEST}{DDMM}{ADULTS}?marker=...
      const retPart = ret ? `${destination}${ret.dd}${ret.mm}` : destination
      const adults = yolcu?.yetiskin || 1
      return `https://www.aviasales.com/search/${origin}${dep.dd}${dep.mm}${retPart}${adults}?marker=${MARKER}&locale=tr&currency=try&sorting=price${yolcu?.cocuk ? `&children=${yolcu.cocuk}` : ''}${yolcu?.bebek ? `&infants=${yolcu.bebek}` : ''}`
    }

    case 'skyscanner': {
      // Format: /transport/flights/{origin}/{dest}/{YYMMDD}/{YYMMDD}/
      const depCode = `${dep.yy}${dep.mm}${dep.dd}`
      const retCode = ret ? `${ret.yy}${ret.mm}${ret.dd}` : ''
      const retPath = retCode ? `/${retCode}` : ''
      return `https://www.skyscanner.com.tr/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${depCode}${retPath}/?adultsv2=${yolcu?.yetiskin || 1}${yolcu?.cocuk ? `&childrenv2=${new Array(yolcu.cocuk).fill('8').join('%7C')}` : ''}&currency=TRY`
    }

    case 'kiwi': {
      // Format: /en/search/tiles/{origin-slug}/{dest-slug}/{YYYY-MM-DD}/{YYYY-MM-DD}
      const oSlug = KIWI_SLUGS[origin] || origin.toLowerCase()
      const dSlug = KIWI_SLUGS[destination] || destination.toLowerCase()
      const retPath = ret ? `/${ret.full}` : ''
      return `https://www.kiwi.com/tr/search/tiles/${oSlug}/${dSlug}/${dep.full}${retPath}?lang=tr&curr=TRY`
    }

    default:
      return null
  }
}

/**
 * Tüm platformların linklerini tek seferde üretir
 */
export function generateAllLinks(origin, destination, departDate, returnDate, yolcu) {
  return {
    aviasales: generateAffiliateUrl('aviasales', origin, destination, departDate, returnDate, yolcu),
    skyscanner: generateAffiliateUrl('skyscanner', origin, destination, departDate, returnDate, yolcu),
    kiwi: generateAffiliateUrl('kiwi', origin, destination, departDate, returnDate, yolcu),
  }
}

/**
 * Affiliate linki açar. İngilizce siteler Google Translate proxy ile Türkçeye çevrilir.
 */
export function openAffiliate(url) {
  if (!url) return
  window.open(googleTranslateWrap(url), '_blank')
}
