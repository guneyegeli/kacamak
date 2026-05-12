import { useEffect } from 'react'

// Sayfa state değerini GA4 page_path'ine çevirir
function sayfayiPathaCevir(sayfa, ekVeri) {
  switch (sayfa) {
    case 'ana':
      return { path: '/', title: 'Ana Sayfa' }
    case 'tercihler':
      return { path: '/tercihler', title: 'Tercihler' }
    case 'detay': {
      const iata = ekVeri?.varis_iata || ekVeri?.iata || ''
      return {
        path: iata ? `/firsat/${iata}` : '/firsat',
        title: iata ? `Fırsat Detay — ${iata}` : 'Fırsat Detay',
      }
    }
    case 'rehberler':
      return { path: '/rehberler', title: 'Rehberler' }
    case 'rehber':
      return {
        path: ekVeri ? `/rehber/${ekVeri}` : '/rehber',
        title: ekVeri ? `Rehber — ${ekVeri}` : 'Rehber',
      }
    default:
      return { path: `/${sayfa}`, title: sayfa }
  }
}

// SPA sayfa geçişlerinde GA4'e page_view gönderir
export function useGoogleAnalytics(sayfa, ekVeri) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return

    const { path, title } = sayfayiPathaCevir(sayfa, ekVeri)
    const location = window.location.origin + path

    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
      page_location: location,
    })
  }, [sayfa, ekVeri])
}

export default useGoogleAnalytics
