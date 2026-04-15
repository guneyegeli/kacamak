import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { generateAllLinks, openAffiliate } from '../utils/affiliateLinks'

const isMobile = window.innerWidth < 768

export default function Rehber({ iata, onGeri, onFirsat }) {
  const [rehber, setRehber] = useState(null)
  const [foto, setFoto] = useState(null)
  const [firsatlar, setFirsatlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    if (!iata) return
    setYukleniyor(true)
    api.rehber(iata).then(setRehber).catch(() => setRehber(null)).finally(() => setYukleniyor(false))
    api.foto(iata).then(f => { if (f?.length) setFoto(f[0]) }).catch(() => {})
    api.firsatlar({ varis: iata }).then(r => {
      const liste = Array.isArray(r) ? r : (r?.firsatlar || [])
      setFirsatlar(liste.slice(0, 5))
    }).catch(() => {})
  }, [iata])

  useEffect(() => {
    if (rehber) {
      document.title = `${rehber.sehir} Seyahat Rehberi 2026 | Dedektif Gezgin`
      let meta = document.querySelector('meta[name="description"]')
      if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta) }
      meta.content = rehber.meta_description || `${rehber.sehir} seyahat rehberi — gezilecek yerler, yemekler, ipuçları`
    }
    return () => { document.title = 'Dedektif Gezgin - Seyahat Fırsatları' }
  }, [rehber])

  const cs = { background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }
  const lbl = { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 12 }

  if (yukleniyor) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
        <p>Rehber yükleniyor...</p>
      </div>
    </div>
  )

  if (!rehber) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Rehber bulunamadı</h3>
        <button onClick={onGeri} style={{ background: 'var(--accent-orange)', border: 'none', borderRadius: 10, padding: '10px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Geri Dön</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)', paddingBottom: 40, overflowX: 'hidden' }}>
      {/* Hero */}
      <div style={{ position: 'relative', width: '100vw', marginLeft: 'calc(-50vw + 50%)', height: 280, overflow: 'hidden', background: foto ? undefined : 'linear-gradient(135deg, #1e293b 0%, #334155 40%, #FF5C1A 100%)' }}>
        {foto && <img src={foto.url_orta} alt={rehber.sehir} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.75))' }} />
        <button onClick={onGeri} style={{ position: 'fixed', top: 60, left: 16, background: 'rgba(13,27,42,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '10px 20px', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600, zIndex: 100 }}><span style={{ fontSize: 18, marginRight: 6 }}>‹</span>Geri</button>
        <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginBottom: 4 }}>📖 Seyahat Rehberi</div>
          <div style={{ fontSize: 32, fontWeight: 500, color: '#fff' }}>{rehber.sehir}, {rehber.ulke}</div>
        </div>
      </div>

      <div style={{ padding: isMobile ? '20px 16px' : '20px 28px', maxWidth: 800, margin: '0 auto' }}>
        {/* Tanıtım */}
        <div style={{ ...cs, padding: 20, marginBottom: 16 }}>
          <div style={lbl}>🏙️ Şehir Hakkında</div>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{rehber.tanitim}</p>
        </div>

        {/* Gezilecek Yerler */}
        {rehber.gezilecek_yerler?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={lbl}>📍 Mutlaka Görülmesi Gereken Yerler</div>
            {rehber.gezilecek_yerler.map((yer, i) => (
              <div key={i} style={{ ...cs, padding: 16, marginBottom: 10, borderLeft: '3px solid var(--accent-orange)' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{yer.isim}</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 6 }}>{yer.aciklama}</div>
                {yer.ipucu && <div style={{ fontSize: 12, color: 'var(--accent-amber)' }}>💡 {yer.ipucu}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Yemekler */}
        {rehber.yemekler?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={lbl}>🍽️ Yerel Lezzetler</div>
            <div style={{ ...cs, padding: 16 }}>
              {rehber.yemekler.map((y, i) => (
                <div key={i} style={{ paddingBottom: i < rehber.yemekler.length - 1 ? 12 : 0, marginBottom: i < rehber.yemekler.length - 1 ? 12 : 0, borderBottom: i < rehber.yemekler.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-orange)' }}>{y.isim}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>{y.aciklama}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* İpuçları */}
        {rehber.ipuclari && (
          <div style={{ ...cs, padding: 20, marginBottom: 16 }}>
            <div style={lbl}>💡 Pratik Bilgiler</div>
            {rehber.ipuclari.ulasim && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>🚌 <strong style={{ color: 'var(--text-primary)' }}>Ulaşım:</strong> {rehber.ipuclari.ulasim}</div>}
            {rehber.ipuclari.para && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>💰 <strong style={{ color: 'var(--text-primary)' }}>Para:</strong> {rehber.ipuclari.para}</div>}
            {rehber.ipuclari.dil && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>🗣️ <strong style={{ color: 'var(--text-primary)' }}>Dil:</strong> {rehber.ipuclari.dil}</div>}
            {rehber.ipuclari.guvenlik && <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>🛡️ <strong style={{ color: 'var(--text-primary)' }}>Güvenlik:</strong> {rehber.ipuclari.guvenlik}</div>}
          </div>
        )}

        {/* Bütçe & Zaman */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {rehber.en_iyi_zaman && (
            <div style={{ ...cs, padding: 16, flex: 1, minWidth: 200 }}>
              <div style={lbl}>📅 En İyi Zaman</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{rehber.en_iyi_zaman}</div>
            </div>
          )}
          {rehber.butce && (
            <div style={{ ...cs, padding: 16, flex: 1, minWidth: 200 }}>
              <div style={lbl}>💶 Günlük Bütçe</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div>🟢 <strong>Ekonomik:</strong> {rehber.butce.ekonomik}</div>
                <div>🟡 <strong>Orta:</strong> {rehber.butce.orta}</div>
                <div>🔴 <strong>Lüks:</strong> {rehber.butce.luks || rehber.butce.luksur}</div>
              </div>
            </div>
          )}
        </div>

        {/* Bu şehre uçuş fırsatları */}
        {firsatlar.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={lbl}>✈️ {rehber.sehir} Uçuş Fırsatları</div>
            {firsatlar.map(f => (
              <div key={f.id} onClick={() => onFirsat?.(f)} style={{ ...cs, padding: 14, marginBottom: 10, cursor: 'pointer', borderLeft: '3px solid var(--accent-orange)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{f.cikis_sehir || f.cikis} → {rehber.sehir}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{f.ucus_tarihi}{f.donus_tarihi ? ` → ${f.donus_tarihi}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-orange)' }}>{f.fiyat?.toLocaleString('tr-TR')} ₺</div>
                    <div style={{ fontSize: 11, color: 'var(--accent-amber)' }}>%{f.indirim_orani} ucuz</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kaynak notu */}
        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Bu rehber AI tarafından üretilmiştir. Güncel bilgiler için resmi kaynakları kontrol edin.
        </div>
      </div>
    </div>
  )
}
