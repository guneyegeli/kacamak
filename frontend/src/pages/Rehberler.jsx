import { useState, useEffect } from 'react'
import { api } from '../services/api'

const isMobile = window.innerWidth < 768

export default function Rehberler({ onRehber, onGeri }) {
  const [liste, setListe] = useState([])
  const [fotolar, setFotolar] = useState({})
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    document.title = 'Seyahat Rehberleri | Dedektif Gezgin'
    api.rehberler().then(r => {
      setListe(Array.isArray(r) ? r : [])
      // Her şehir için fotoğraf çek
      const arr = Array.isArray(r) ? r : []
      arr.forEach(item => {
        api.foto(item.iata).then(f => {
          if (f?.length) setFotolar(prev => ({ ...prev, [item.iata]: f[0] }))
        }).catch(() => {})
      })
    }).catch(() => {}).finally(() => setYukleniyor(false))
    return () => { document.title = 'Dedektif Gezgin - Seyahat Fırsatları' }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 24px', textAlign: 'center' }}>
        <button onClick={onGeri} style={{ position: 'absolute', top: 56, left: 16, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}><span style={{ marginRight: 4 }}>‹</span>Ana Sayfa</button>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>📖 Seyahat Rehberleri</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Popüler destinasyonlar için kapsamlı gezi rehberleri</p>
      </div>

      <div style={{ padding: isMobile ? '0 16px 40px' : '0 28px 40px', maxWidth: 900, margin: '0 auto' }}>
        {yukleniyor && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
            <p>Rehberler yükleniyor...</p>
          </div>
        )}

        {!yukleniyor && liste.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Henüz rehber oluşturulmamış</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Yakında popüler destinasyonlar için rehberler eklenecek.</p>
          </div>
        )}

        {!yukleniyor && liste.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 14 }}>
            {liste.map(item => {
              const foto = fotolar[item.iata]
              return (
                <div key={item.iata} onClick={() => onRehber(item.iata)} style={{
                  background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
                  overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-card)', transition: 'transform 0.15s',
                }}>
                  <div style={{ height: 140, overflow: 'hidden', background: foto ? undefined : 'linear-gradient(135deg, #1e293b 0%, #334155 40%, #FF5C1A 100%)' }}>
                    {foto && <img src={foto.url_kucuk || foto.url_orta} alt={item.sehir} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{item.sehir}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{item.ulke}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent-orange)', fontWeight: 600 }}>Rehberi Gör →</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
