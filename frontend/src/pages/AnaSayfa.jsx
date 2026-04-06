import { useState, useEffect } from 'react'
import { api } from '../services/api'

const tarihFormat = (tarih) => {
  if (!tarih) return ''
  try {
    const d = new Date(tarih + 'T00:00:00')
    const aylar = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara']
    return `${d.getDate()} ${aylar[d.getMonth()]}`
  } catch { return tarih }
}

const geceSay = (gidis, donus) => {
  if (!gidis || !donus) return null
  try {
    const g = new Date(gidis + 'T00:00:00')
    const d = new Date(donus + 'T00:00:00')
    return Math.round((d - g) / 86400000)
  } catch { return null }
}

const kenarRengi = (oran) => {
  if (oran >= 50) return '#FF6B35'
  if (oran >= 30) return '#F7C948'
  return '#2EC4B6'
}

const kartGradient = (kod) => {
  const hash = (kod || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const aclar = [135, 160, 200, 225, 315]
  const aci = aclar[hash % aclar.length]
  const renkler = [
    ['#1B1F3B', '#2a2f5a', '#FF6B35'],
    ['#1B1F3B', '#1e3a5f', '#2EC4B6'],
    ['#1B1F3B', '#3b1f4a', '#F7C948'],
    ['#1B1F3B', '#1f3b2a', '#4ade80'],
    ['#1B1F3B', '#3b2a1f', '#FF6B35'],
  ]
  const r = renkler[hash % renkler.length]
  return `linear-gradient(${aci}deg, ${r[0]} 0%, ${r[1]} 50%, ${r[2]} 100%)`
}

export default function AnaSayfa({ onFirsat, onTercih }) {
  const [firsatlar, setFirsatlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [fotolar, setFotolar] = useState({})
  const [altTarihler, setAltTarihler] = useState({})
  useEffect(() => {
    api.firsatlar().then(data => {
      setFirsatlar(data)
      data.forEach(f => {
        const kod = f.varis
        if (!fotolar[kod]) {
          api.foto(kod).then(fotos => {
            if (fotos?.length) setFotolar(prev => ({...prev, [kod]: fotos[0]}))
          }).catch(() => {})
        }
        api.alternatifTarihler(f.id).then(alt => {
          if (alt?.length) setAltTarihler(prev => ({...prev, [f.id]: alt.slice(0, 3)}))
        }).catch(() => {})
      })
    }).catch(() => setFirsatlar([])).finally(() => setYukleniyor(false))
  }, [])
  return (
    <div className="page-constrained" style={{minHeight:'100vh',background:'var(--bg)'}}>
      <div style={{padding:'56px 20px 24px',borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
          <div>
            <p style={{fontSize:11,color:'var(--accent2)',letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:500,marginBottom:6}}>Bugunun firsatlari</p>
            <h1 style={{fontSize:30,fontWeight:500,lineHeight:1.1,color:'var(--text)'}}>Kacamak</h1>
          </div>
          <button onClick={onTercih} style={{background:'var(--bg2)',backdropFilter:'blur(12px)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 16px',color:'var(--text2)',fontSize:13,fontWeight:500,cursor:'pointer'}}>Tercihler</button>
        </div>
      </div>
      <div style={{padding:20}}>
        {yukleniyor && (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--text2)'}}>
            <div style={{fontSize:32,marginBottom:12}}>✈</div>
            <p>Firsatlar araniyor...</p>
          </div>
        )}
        {!yukleniyor && firsatlar.length===0 && (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:48,marginBottom:16}}>🔍</div>
            <h3 style={{marginBottom:8,fontWeight:500}}>Henuz firsat yok</h3>
            <p style={{color:'var(--text2)',fontSize:14,lineHeight:1.6}}>Sistem her 30 dakikada fiyatlari tariyor.</p>
          </div>
        )}
        {firsatlar.map(f => {
          const foto = fotolar[f.varis]
          const renk = kenarRengi(f.indirim_orani)
          return (
            <div key={f.id} onClick={() => onFirsat(f)} style={{borderRadius:'var(--radius)',border:'1px solid var(--border)',borderLeft:`3px solid ${renk}`,marginBottom:14,cursor:'pointer',overflow:'hidden',background:'var(--bg2)',backdropFilter:'blur(12px)'}}>
              {/* Kapak: foto veya gradient */}
              <div style={{position:'relative',height:140,overflow:'hidden',background:foto?undefined:kartGradient(f.varis)}}>
                {foto && <img src={foto.url_kucuk} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />}
                <div style={{position:'absolute',inset:0,background:foto?'linear-gradient(transparent 40%, rgba(27,31,59,0.9))':'linear-gradient(transparent 20%, rgba(27,31,59,0.85))'}} />
                <div style={{position:'absolute',bottom:10,left:14,right:14}}>
                  <div style={{fontSize:22,fontWeight:500,color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,0.5)'}}>{f.varis_sehir || f.varis}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:2,fontWeight:500}}>{f.cikis} → {f.varis} · {tarihFormat(f.ucus_tarihi)}{f.donus_tarihi ? ` → ${tarihFormat(f.donus_tarihi)}` : ''}{geceSay(f.ucus_tarihi, f.donus_tarihi) ? ` (${geceSay(f.ucus_tarihi, f.donus_tarihi)} gece)` : ''}</div>
                </div>
                <div style={{position:'absolute',top:10,right:10,background:'rgba(247,201,72,0.9)',borderRadius:8,padding:'6px 10px',textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:700,color:'#1B1F3B'}}>%{f.indirim_orani}</div>
                </div>
              </div>
              {/* Fiyat + alternatif tarihler */}
              <div style={{padding:'12px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <span style={{fontSize:24,fontWeight:700,color:'var(--accent)'}}>{f.fiyat?.toLocaleString('tr-TR')} ₺</span>
                    <span style={{fontSize:11,color:'var(--accent)',fontWeight:500,marginLeft:4}}>gidis-donus</span>
                    <span style={{fontSize:13,color:'var(--text3)',textDecoration:'line-through',marginLeft:8}}>{f.normal_fiyat?.toLocaleString('tr-TR')} ₺</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--accent)',fontWeight:500}}>Detay →</div>
                </div>
                {altTarihler[f.id]?.length > 0 && (
                  <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--border)',fontSize:11,color:'var(--text3)'}}>
                    <span style={{color:'var(--accent2)',fontWeight:500}}>Diger tarihler: </span>
                    {altTarihler[f.id].map((a, i) => (
                      <span key={a.id}>{i > 0 && ' · '}<span style={{color:'var(--text2)'}}>{tarihFormat(a.ucus_tarihi)} {a.fiyat?.toLocaleString('tr-TR')}₺</span></span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
