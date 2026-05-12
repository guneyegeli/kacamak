// Affiliate link tıklamalarını GA4'e özel event olarak gönderir
// Kullanım: trackAffiliateClick('aviasales', 'BCN', firsat.id)
export function trackAffiliateClick(provider, destination, dealId) {
  const veri = {
    provider: provider || 'bilinmiyor',
    destination: destination || null,
    deal_id: dealId || null,
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
