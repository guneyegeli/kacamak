// Affiliate link tıklamalarını GA4'e özel event olarak gönderir
// Kullanım: trackAffiliateClick('aviasales', 'BCN', firsat.id)
// Veya:    trackAffiliateClick(null, null, null, { partner: 'ekta', placement: 'detay-yurtdisi' })
export function trackAffiliateClick(provider, destination, dealId, ekstra) {
  const veri = {
    provider: provider || 'bilinmiyor',
    destination: destination || null,
    deal_id: dealId || null,
    ...(ekstra && typeof ekstra === 'object' ? ekstra : {}),
  }

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'affiliate_click', veri)
  }

  // Debug: tarayıcı konsolunda görünür
  if (typeof console !== 'undefined') {
    console.log('[affiliate_click]', veri)
  }
}

export default trackAffiliateClick
