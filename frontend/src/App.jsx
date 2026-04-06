import { useState, useEffect } from 'react'
import AnaSayfa from './pages/AnaSayfa'
import Tercihler from './pages/Tercihler'
import FirsatDetay from './pages/FirsatDetay'
import { bildirimIzniIste, bildirimDinle } from './services/firebase'
import { api } from './services/api'
import './App.css'

export default function App() {
  const [sayfa, setSayfa] = useState('ana')
  const [seciliFirsat, setSeciliFirsat] = useState(null)
  const [bildirim, setBildirim] = useState(null)

  useEffect(() => {
    bildirimIzniIste().then((token) => {
      if (token) {
        api.fcmTokenGuncelle(token).catch(console.error)
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
    setSayfa(s)
  }

  return (
    <div className="app">
      {bildirim && (
        <div style={{position:'fixed',top:12,left:12,right:12,zIndex:999,background:'rgba(27,31,59,0.95)',backdropFilter:'blur(16px)',border:'1px solid var(--accent)',borderRadius:'var(--radius)',padding:'16px 18px',animation:'slideDown 0.3s ease',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:3,color:'var(--accent)'}}>{bildirim.baslik}</div>
          <div style={{fontSize:13,color:'var(--text2)'}}>{bildirim.mesaj}</div>
        </div>
      )}
      {sayfa === 'ana' && <AnaSayfa onFirsat={(f) => sayfaGoster('detay', f)} onTercih={() => sayfaGoster('tercihler')} />}
      {sayfa === 'tercihler' && <Tercihler onGeri={() => sayfaGoster('ana')} />}
      {sayfa === 'detay' && <FirsatDetay firsat={seciliFirsat} onGeri={() => sayfaGoster('ana')} onFirsat={(f) => sayfaGoster('detay', f)} />}
    </div>
  )
}
