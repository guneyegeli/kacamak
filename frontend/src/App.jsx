import { useState, useEffect } from 'react'
import AnaSayfa from './pages/AnaSayfa'
import Tercihler from './pages/Tercihler'
import FirsatDetay from './pages/FirsatDetay'
import Rehberler from './pages/Rehberler'
import Rehber from './pages/Rehber'
import { bildirimIzniIste, bildirimDinle } from './services/firebase'
import { api } from './services/api'
import { useGoogleAnalytics } from './hooks/useGoogleAnalytics'
import './App.css'

export default function App() {
  const [sayfa, setSayfa] = useState('ana')
  const [seciliFirsat, setSeciliFirsat] = useState(null)
  const [seciliRehber, setSeciliRehber] = useState(null)
  const [bildirim, setBildirim] = useState(null)

  // Sayfa state'i değiştikçe GA4'e page_view gönderir
  const gaEkVeri = sayfa === 'rehber' ? seciliRehber : sayfa === 'detay' ? seciliFirsat : null
  useGoogleAnalytics(sayfa, gaEkVeri)

  useEffect(() => {
    bildirimIzniIste().then((token) => {
      if (token) {
        api.fcmTokenGuncelle(token).catch(() => {})
      }
    })

    const unsub = bildirimDinle((payload) => {
      setBildirim({
        baslik: payload.notification?.title,
        mesaj: payload.notification?.body,
      })
      setTimeout(() => setBildirim(null), 5000)
    })

    return unsub
  }, [])

  const sayfaGoster = (s, veri = null) => {
    setSeciliFirsat(veri)
    if (s === 'rehber') setSeciliRehber(veri)
    setSayfa(s)
  }

  return (
    <div className="app">
      {bildirim && (
        <div style={{position:'fixed',top:12,left:12,right:12,zIndex:999,background:'var(--bg-secondary)',backdropFilter:'blur(16px)',border:'1px solid var(--accent-orange)',borderRadius:'var(--radius)',padding:'16px 18px',animation:'slideDown 0.3s ease',boxShadow:'var(--shadow-dropdown)'}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:3,color:'var(--accent-orange)'}}>{bildirim.baslik}</div>
          <div style={{fontSize:13,color:'var(--text-secondary)'}}>{bildirim.mesaj}</div>
        </div>
      )}
      {sayfa === 'ana' && <AnaSayfa onFirsat={(f) => sayfaGoster('detay', f)} onTercih={() => sayfaGoster('tercihler')} onRehberler={() => sayfaGoster('rehberler')} />}
      {sayfa === 'tercihler' && <Tercihler onGeri={() => sayfaGoster('ana')} />}
      {sayfa === 'detay' && <FirsatDetay firsat={seciliFirsat} onGeri={() => sayfaGoster('ana')} onFirsat={(f) => sayfaGoster('detay', f)} />}
      {sayfa === 'rehberler' && <Rehberler onRehber={(iata) => sayfaGoster('rehber', iata)} onGeri={() => sayfaGoster('ana')} />}
      {sayfa === 'rehber' && <Rehber iata={seciliRehber} onGeri={() => sayfaGoster('rehberler')} onFirsat={(f) => sayfaGoster('detay', f)} />}
    </div>
  )
}
