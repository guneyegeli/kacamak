import { useState, useEffect } from 'react'
import { api } from '../services/api'

// IATA → Şehir adı mapping
const SEHIR_ADLARI = {
  IST: 'İstanbul', SAW: 'İstanbul', ADB: 'İzmir', AYT: 'Antalya', ESB: 'Ankara',
  ADA: 'Adana', DLM: 'Dalaman', BJV: 'Bodrum', NAV: 'Nevşehir', GZP: 'Trabzon',
  TZX: 'Trabzon', GZT: 'Gaziantep', VAN: 'Van', ERZ: 'Erzurum', TRS: 'Trabzon',
  SZF: 'Samsun', IZM: 'İzmir', ANK: 'Ankara', ECN: 'Lefkoşa', COV: 'Konya',
  GNJ: 'Gence', BJV: 'Bodrum',
  MOW: 'Moskova', TAS: 'Taşkent', BAK: 'Bakü', AER: 'Soçi', KRR: 'Krasnodar',
  LED: 'St. Petersburg', MRV: 'Mineralnye Vody', PAR: 'Paris', MCX: 'Mahaçkale',
  KZN: 'Kazan', RMO: 'Rostov', JED: 'Cidde', OGZ: 'Vladikavkaz', SKD: 'Samarkand',
  GRV: 'Grozny', TIV: 'Tivat', BCN: 'Barselona', SVX: 'Yekaterinburg',
  BUD: 'Budapeşte', TGD: 'Podgorica', BEG: 'Belgrad', BSZ: 'Bişkek',
  ATH: 'Atina', ROM: 'Roma', TBS: 'Tiflis', MED: 'Medine',
  LON: 'Londra', LIS: 'Lizbon', SSH: 'Şarm El Şeyh', NQZ: 'Nursultan',
  ALA: 'Almatı', MSQ: 'Minsk', CEK: 'Çelyabinsk', UFA: 'Ufa',
  OVB: 'Novosibirsk', KUF: 'Samara', PEE: 'Perm', CIT: 'Şymkent',
  GOJ: 'Nijniy Novgorod', OMS: 'Omsk', KJA: 'Krasnoyarsk', TJM: 'Tümen',
  KGD: 'Kaliningrad', RTW: 'Saratov', OSS: 'Oş', GZP: 'Hopa',
  DXB: 'Dubai', DOH: 'Doha', CAI: 'Kahire', BKK: 'Bangkok',
}

// Yurtiçi havaalanı kodları
const YURTICI_KODLARI = new Set([
  'AYT', 'DLM', 'ADB', 'ESB', 'TZX', 'GZT', 'ADA', 'BJV', 'NAV', 'VAN',
  'ERZ', 'TRS', 'SZF', 'IST', 'SAW', 'IZM', 'ANK', 'COV', 'GZP'
])

const sehirAdi = (f) => {
  if (f.varis_sehir) return f.varis_sehir
  return SEHIR_ADLARI[f.varis] || f.varis
}

const cikisSehirAdi = (kod) => SEHIR_ADLARI[kod] || kod

const tarihFormat = (tarih) => {
  if (!tarih) return ''
  try {
    const d = new Date(tarih + 'T00:00:00')
    const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
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

function FirsatKart({ f, fotolar, altTarihler, onFirsat }) {
  const foto = fotolar[f.varis]
  const renk = kenarRengi(f.indirim_orani)
  const gece = geceSay(f.ucus_tarihi, f.donus_tarihi)
  const sehir = sehirAdi(f)
  const cikis = cikisSehirAdi(f.cikis)
  const yeni = f.yeni === 1 || (f.olusturulma && (Date.now() - new Date(f.olusturulma).getTime()) < 86400000)

  return (
    <div onClick={() => onFirsat(f)} style={{borderRadius:'var(--radius)',border:'1px solid var(--border)',borderLeft:`3px solid ${renk}`,marginBottom:14,cursor:'pointer',overflow:'hidden',background:'var(--bg2)',backdropFilter:'blur(12px)'}}>
      <div style={{position:'relative',height:140,overflow:'hidden',background:foto?undefined:kartGradient(f.varis)}}>
        {foto && <img src={foto.url_kucuk} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />}
        <div style={{position:'absolute',inset:0,background:foto?'linear-gradient(transparent 20%, rgba(27,31,59,0.95))':'linear-gradient(transparent 10%, rgba(27,31,59,0.9))'}} />
        <div style={{position:'absolute',bottom:10,left:14,right:14}}>
          <div style={{display:'flex',alignItems:'baseline',gap:6}}>
            <span style={{fontSize:22,fontWeight:500,color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,0.5)'}}>{sehir}</span>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:500}}>({f.varis})</span>
          </div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.85)',marginTop:2,fontWeight:500}}>
            {cikis} ({f.cikis}) → {sehir} ({f.varis})
            {f.ucus_tarihi ? ` · ${tarihFormat(f.ucus_tarihi)}` : ''}
            {f.donus_tarihi ? ` → ${tarihFormat(f.donus_tarihi)}` : ''}
            {gece ? ` (${gece} gece)` : ''}
          </div>
        </div>
        {yeni && (
          <div className="yeni-badge" style={{position:'absolute',top:10,left:10,background:'#FF6B35',borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700,color:'#fff',letterSpacing:'0.05em',boxShadow:'0 0 12px rgba(255,107,53,0.6)'}}>
            YEN&#304;
          </div>
        )}
        <div style={{position:'absolute',top:10,right:10,background:'rgba(247,201,72,0.9)',borderRadius:8,padding:'6px 10px',textAlign:'center'}}>
          <div style={{fontSize:16,fontWeight:700,color:'#1B1F3B'}}>%{f.indirim_orani}</div>
        </div>
      </div>
      <div style={{padding:'12px 16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <span style={{fontSize:24,fontWeight:700,color:'var(--accent)'}}>{f.fiyat?.toLocaleString('tr-TR')} ₺</span>
            <span style={{fontSize:11,color:'var(--accent)',fontWeight:500,marginLeft:4}}>gidiş-dönüş</span>
            <span style={{fontSize:13,color:'var(--text3)',textDecoration:'line-through',marginLeft:8}}>{f.normal_fiyat?.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div style={{fontSize:12,color:'var(--accent)',fontWeight:500}}>Detay →</div>
        </div>
        {altTarihler[f.id]?.length > 0 && (
          <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--border)',fontSize:11,color:'var(--text3)'}}>
            <span style={{color:'var(--accent2)',fontWeight:500}}>Diğer tarihler: </span>
            {altTarihler[f.id].map((a, i) => (
              <span key={a.id}>{i > 0 && ' · '}<span style={{color:'var(--text2)'}}>{tarihFormat(a.ucus_tarihi)} {a.fiyat?.toLocaleString('tr-TR')}₺</span></span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AnaSayfa({ onFirsat, onTercih }) {
  const [firsatlar, setFirsatlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [fotolar, setFotolar] = useState({})
  const [altTarihler, setAltTarihler] = useState({})

  useEffect(() => {
    api.firsatlar().then(data => {
      // Backend zaten sıralıyor: önce yeni (24 saat), sonra eski — indirim oranına göre
      const sirali = data
      setFirsatlar(sirali)
      sirali.forEach(f => {
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

  const yurtici = firsatlar.filter(f => YURTICI_KODLARI.has(f.varis))
  const yurtdisi = firsatlar.filter(f => !YURTICI_KODLARI.has(f.varis))

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      {/* Header */}
      <div className="page-constrained" style={{padding:'56px 20px 24px',borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
          <div>
            <p style={{fontSize:11,color:'var(--accent2)',letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:500,marginBottom:6}}>Bugünün fırsatları</p>
            <h1 style={{fontSize:30,fontWeight:500,lineHeight:1.1,color:'var(--text)'}}>Kaçamak</h1>
          </div>
          <button onClick={onTercih} style={{background:'var(--bg2)',backdropFilter:'blur(12px)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 16px',color:'var(--text2)',fontSize:13,fontWeight:500,cursor:'pointer'}}>Tercihler</button>
        </div>
      </div>

      {/* İçerik */}
      <div style={{padding:'20px 20px 40px',maxWidth:1100,margin:'0 auto'}}>
        {yukleniyor && (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--text2)'}}>
            <div style={{fontSize:32,marginBottom:12}}>✈</div>
            <p>Fırsatlar aranıyor...</p>
          </div>
        )}
        {!yukleniyor && firsatlar.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:48,marginBottom:16}}>🔍</div>
            <h3 style={{marginBottom:8,fontWeight:500}}>Henüz fırsat yok</h3>
            <p style={{color:'var(--text2)',fontSize:14,lineHeight:1.6}}>Sistem her 30 dakikada fiyatları tarıyor.</p>
          </div>
        )}

        {!yukleniyor && firsatlar.length > 0 && (
          <div className="firsatlar-grid">
            {/* Yurtiçi Kolon */}
            <div className="firsatlar-kolon">
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
                <div style={{width:4,height:20,borderRadius:2,background:'var(--accent)'}} />
                <h2 style={{fontSize:14,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--accent)'}}>Yurtiçi Fırsatlar</h2>
              </div>
              {yurtici.length === 0 && (
                <p style={{color:'var(--text3)',fontSize:13,padding:'20px 0'}}>Yurtiçi fırsat bulunamadı.</p>
              )}
              {yurtici.map(f => (
                <FirsatKart key={f.id} f={f} fotolar={fotolar} altTarihler={altTarihler} onFirsat={onFirsat} />
              ))}
            </div>

            {/* Yurtdışı Kolon */}
            <div className="firsatlar-kolon">
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
                <div style={{width:4,height:20,borderRadius:2,background:'var(--success)'}} />
                <h2 style={{fontSize:14,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--success)'}}>Yurtdışı Fırsatlar</h2>
              </div>
              {yurtdisi.length === 0 && (
                <p style={{color:'var(--text3)',fontSize:13,padding:'20px 0'}}>Yurtdışı fırsat bulunamadı.</p>
              )}
              {yurtdisi.map(f => (
                <FirsatKart key={f.id} f={f} fotolar={fotolar} altTarihler={altTarihler} onFirsat={onFirsat} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
