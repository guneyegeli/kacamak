const MARKER = import.meta.env.VITE_TRAVELPAYOUTS_MARKER || '518734'

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
  'hotellook.com',
  'tpk.mx',
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
      return `https://www.aviasales.com/search/${origin}${dep.dd}${dep.mm}${retPart}${adults}?marker=${MARKER}&locale=tr&currency=try&lang=tr&sorting=price${yolcu?.cocuk ? `&children=${yolcu.cocuk}` : ''}${yolcu?.bebek ? `&infants=${yolcu.bebek}` : ''}`
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
  }
}

/**
 * Affiliate linki açar. İngilizce siteler Google Translate proxy ile Türkçeye çevrilir.
 */
export function openAffiliate(url) {
  if (!url) return
  window.open(googleTranslateWrap(url), '_blank')
}
