import { useEffect, useState } from 'react'
import trackAffiliateClick from '../utils/trackAffiliate'

const isMobile = window.innerWidth < 768

const SECTION_TITLE = { fontSize: 13, fontWeight: 600, color: 'var(--accent-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }
const ITEM = { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 6 }
const CODE = { fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }

export default function AviasalesModal({ acik, onKapat, aviasalesUrl, destination, dealId }) {
  const [birDahaGosterme, setBirDahaGosterme] = useState(false)

  useEffect(() => {
    if (!acik) return
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'affiliate_modal_open', { partner: 'aviasales' })
    }
    const handler = e => { if (e.key === 'Escape') onKapat() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [acik, onKapat])

  if (!acik) return null

  const vazgec = () => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'affiliate_modal_cancel', { partner: 'aviasales' })
    }
    onKapat()
  }

  const aviasaleseGit = () => {
    if (birDahaGosterme) {
      try { localStorage.setItem('aviasales_modal_hidden', 'true') } catch {}
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'affiliate_modal_dismissed', { partner: 'aviasales' })
      }
    }
    trackAffiliateClick('aviasales', destination || null, dealId || null)
    window.open(aviasalesUrl, '_blank')
  }

  return (
    <>
      <div onClick={onKapat} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        background: 'var(--bg-tertiary)', borderRadius: '20px 20px 0 0',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
        animation: 'aviasalesModalSlideUp 0.25s ease-out',
        maxWidth: 600, margin: '0 auto',
      }}>
        <div style={{ padding: '18px 22px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 1, borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: '#FF5C1A' }} />
            <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Aviasales nasıl kullanılır?</h3>
          </div>
          <button onClick={onKapat} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--text-secondary)', cursor: 'pointer', padding: 8, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Kapat">✕</button>
        </div>

        <div style={{ padding: '16px 22px 22px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 0, marginBottom: 18 }}>
            Aviasales İngilizce ama 1 dakikada çözülür. En önemli iki şey:
          </p>

          <div style={{ marginBottom: 18 }}>
            <div style={SECTION_TITLE}>📦 BAGAJ KONTROLÜ</div>
            <div style={{ ...ITEM, marginBottom: 8 }}>Uçuş kartında şunları gör:</div>
            <div style={ITEM}><span style={CODE}>Baggage included</span> → Bagaj dahil</div>
            <div style={ITEM}><span style={CODE}>Personal item only</span> → Sadece el çantası (bavul ekstra ücretli)</div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={SECTION_TITLE}>⚙️ SIRALAMA</div>
            <div style={{ ...ITEM, marginBottom: 8 }}>Üstteki sekmeler:</div>
            <div style={ITEM}><span style={CODE}>Cheapest</span> → En ucuz</div>
            <div style={ITEM}><span style={CODE}>Fastest</span> → En hızlı</div>
          </div>

          <div style={{ marginBottom: 22, background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={ITEM}>💡 Sağdaki turuncu "Show" butonu seni en uygun bilete götürür.</div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={birDahaGosterme}
              onChange={e => setBirDahaGosterme(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#FF5C1A', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bir daha gösterme</span>
          </label>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row-reverse', gap: 10 }}>
            <button
              onClick={aviasaleseGit}
              style={{ flex: 1, padding: '13px 18px', background: '#FF5C1A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,92,26,0.4)' }}
            >
              Aviasales'e git →
            </button>
            <button
              onClick={vazgec}
              style={{ flex: 1, padding: '13px 18px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
            >
              Vazgeç
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes aviasalesModalSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  )
}
