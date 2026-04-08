import { useState, useEffect } from 'react'
import { api } from '../services/api'
const HAVAALANLARI = [
  {kod:'ADA',isim:'Adana (ADA)'},{kod:'ESB',isim:'Ankara (ESB)'},{kod:'AYT',isim:'Antalya (AYT)'},
  {kod:'EDO',isim:'Balıkesir (EDO)'},{kod:'BJV',isim:'Bodrum (BJV)'},{kod:'DLM',isim:'Dalaman (DLM)'},
  {kod:'DNZ',isim:'Denizli (DNZ)'},{kod:'DIY',isim:'Diyarbakır (DIY)'},{kod:'EZS',isim:'Elazığ (EZS)'},
  {kod:'ERZ',isim:'Erzurum (ERZ)'},{kod:'GZT',isim:'Gaziantep (GZT)'},{kod:'HTY',isim:'Hatay (HTY)'},
  {kod:'IGD',isim:'Iğdır (IGD)'},{kod:'ISE',isim:'Isparta (ISE)'},{kod:'IST',isim:'İstanbul (IST)'},
  {kod:'SAW',isim:'İstanbul (SAW)'},{kod:'ADB',isim:'İzmir (ADB)'},{kod:'KSY',isim:'Kars (KSY)'},
  {kod:'ASR',isim:'Kayseri (ASR)'},{kod:'KYA',isim:'Konya (KYA)'},{kod:'MLX',isim:'Malatya (MLX)'},
  {kod:'MQM',isim:'Mardin (MQM)'},{kod:'MSR',isim:'Muş (MSR)'},{kod:'SZF',isim:'Samsun (SZF)'},
  {kod:'NOP',isim:'Sinop (NOP)'},{kod:'GNY',isim:'Şanlıurfa (GNY)'},{kod:'TZX',isim:'Trabzon (TZX)'},
  {kod:'VAN',isim:'Van (VAN)'},
]
const TIPLER = ['Sahil','Tarih','Sehir turu','Doga','Yemek turu','Festival']
const OTEL_TIPLERI = [
  {kod:5,isim:'★★★★★ Lüks'},
  {kod:4,isim:'★★★★ Üst Segment'},
  {kod:3,isim:'★★★ Orta Segment'},
  {kod:2,isim:'★★ Ekonomik'},
  {kod:1,isim:'★ Bütçe'},
  {kod:'butik',isim:'Butik Otel'},
  {kod:'apart',isim:'Apart Otel'},
  {kod:'hostel',isim:'Hostel'},
]
const OTEL_KONUMLARI = [
  {kod:'merkez',isim:'Şehir merkezi'},
  {kod:'sahil',isim:'Sahil kenarı'},
  {kod:'havalimani',isim:'Havalimanına yakın'},
  {kod:'farketmez',isim:'Farketmez'},
]
export default function Tercihler({ onGeri }) {
  const [t, setT] = useState({cikis_havalimanlari:['IST','SAW'],maks_butce:8000,min_indirim_orani:30,yetiskin_sayisi:1,cocuk_var:false,esnek_tarih:true,direkt_ucus:false,otel_yildiz:3,otel_yildizlar:[3,4],otel_butce:2000,otel_konum:'farketmez',kahvalti_dahil:false,min_gece:2,max_gece:7,tercih_tipleri:[],paket:{ucus:true,otel:true,etkinlik:true,restoran:true,tur:true}})
  const [mesaj, setMesaj] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  useEffect(() => {
    api.tercihGetir().then(d => { if (!d.ilk_giris && d.tercihler) setT(d.tercihler) }).catch(() => {})
  }, [])
  const toggleH = (kod) => setT(p => ({...p,cikis_havalimanlari:p.cikis_havalimanlari.includes(kod)?p.cikis_havalimanlari.filter(x=>x!==kod):[...p.cikis_havalimanlari,kod]}))
  const toggleTip = (tip) => setT(p => ({...p,tercih_tipleri:p.tercih_tipleri?.includes(tip)?p.tercih_tipleri.filter(x=>x!==tip):[...(p.tercih_tipleri||[]),tip]}))
  const toggleOtelYildiz = (kod) => setT(p => {
    const mevcut = p.otel_yildizlar || []
    return {...p, otel_yildizlar: mevcut.includes(kod) ? mevcut.filter(x=>x!==kod) : [...mevcut, kod]}
  })
  const kaydet = async () => {
    if (yukleniyor) return
    if (!t.cikis_havalimanlari?.length) { setMesaj('En az 1 havaalani secin'); setTimeout(() => setMesaj(''), 2000); return }
    setYukleniyor(true)
    try {
      const res = await api.tercihGuncelle(t)
      if (res.hata) { setMesaj('Hata: ' + res.hata); setTimeout(() => setMesaj(''), 3000); return }
      setMesaj('Kaydedildi!')
      setTimeout(() => { setMesaj(''); onGeri() }, 1000)
    } catch (err) {
      // Tercih kaydetme hatası
      setMesaj('Baglanti hatasi!')
      setTimeout(() => setMesaj(''), 3000)
    } finally {
      setYukleniyor(false)
    }
  }
  const Chip = ({label,aktif,onClick}) => (
    <button onClick={onClick} style={{padding:'8px 14px',borderRadius:20,fontSize:13,cursor:'pointer',fontWeight:500,border:aktif?'1px solid var(--accent)':'1px solid var(--border)',background:aktif?'rgba(255,107,53,0.15)':'var(--bg3)',color:aktif?'var(--accent)':'var(--text2)',marginBottom:4,transition:'all 0.15s'}}>{label}</button>
  )
  const Toggle = ({label,sub,value,onChange}) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 0',borderBottom:'1px solid var(--border)'}}>
      <div><div style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{label}</div>{sub&&<div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{sub}</div>}</div>
      <div onClick={onChange} style={{width:46,height:26,borderRadius:13,cursor:'pointer',background:value?'var(--accent)':'var(--bg3)',border:'1px solid var(--border)',position:'relative',transition:'background 0.2s'}}>
        <div style={{position:'absolute',top:3,left:value?22:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}} />
      </div>
    </div>
  )
  return (
    <div className="page-constrained" style={{minHeight:'100vh',background:'var(--bg)'}}>
      <div style={{padding:'56px 20px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <button onClick={onGeri} style={{background:'var(--bg2)',backdropFilter:'blur(12px)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 14px',color:'var(--text2)',cursor:'pointer',fontSize:13,fontWeight:500}}>Geri</button>
        <h2 style={{fontSize:18,fontWeight:500,color:'var(--text)'}}>Tercihlerim</h2>
        <button onClick={kaydet} disabled={yukleniyor} style={{background:mesaj==='Kaydedildi!'?'var(--success)':mesaj?'#c0392b':'var(--accent)',border:'none',borderRadius:10,padding:'8px 16px',color:'#fff',cursor:yukleniyor?'wait':'pointer',fontSize:13,fontWeight:600,opacity:yukleniyor?0.7:1,transition:'all 0.2s'}}>{mesaj||(yukleniyor?'Kaydediliyor...':'Kaydet')}</button>
      </div>
      <div style={{padding:20}}>
        <div style={{marginBottom:28}}>
          <div style={{fontSize:11,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12,fontWeight:500}}>Cikis havalimani</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{HAVAALANLARI.map(h=><Chip key={h.kod} label={h.isim} aktif={t.cikis_havalimanlari?.includes(h.kod)} onClick={()=>toggleH(h.kod)} />)}</div>
        </div>
        <div style={{marginBottom:28}}>
          <div style={{fontSize:11,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12,fontWeight:500}}>Maksimum butce</div>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <input type="range" min="1000" max="30000" step="500" value={t.maks_butce} onChange={e=>setT(p=>({...p,maks_butce:+e.target.value}))} style={{flex:1,accentColor:'var(--accent)'}} />
            <span style={{fontSize:16,fontWeight:600,minWidth:90,textAlign:'right',color:'var(--accent)'}}>{t.maks_butce?.toLocaleString('tr-TR')} ₺</span>
          </div>
        </div>
        <div style={{marginBottom:28}}>
          <div style={{fontSize:11,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12,fontWeight:500}}>Min indirim</div>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <input type="range" min="10" max="70" step="5" value={t.min_indirim_orani} onChange={e=>setT(p=>({...p,min_indirim_orani:+e.target.value}))} style={{flex:1,accentColor:'var(--accent2)'}} />
            <span style={{fontSize:16,fontWeight:600,minWidth:50,color:'var(--accent2)'}}>%{t.min_indirim_orani}</span>
          </div>
        </div>
        <div style={{marginBottom:28}}>
          <div style={{fontSize:11,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12,fontWeight:500}}>Seyahat tipi</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{TIPLER.map(tip=><Chip key={tip} label={tip} aktif={t.tercih_tipleri?.includes(tip)} onClick={()=>toggleTip(tip)} />)}</div>
        </div>
        <Toggle label="Cocuklu seyahat" sub="Aile dostu oneriler" value={t.cocuk_var} onChange={()=>setT(p=>({...p,cocuk_var:!p.cocuk_var}))} />
        <Toggle label="Esnek tarih" sub="Tarih fark etmez" value={t.esnek_tarih} onChange={()=>setT(p=>({...p,esnek_tarih:!p.esnek_tarih}))} />
        <Toggle label="Sadece direkt ucuslar" value={t.direkt_ucus} onChange={()=>setT(p=>({...p,direkt_ucus:!p.direkt_ucus}))} />

        {/* Otel Tercihleri */}
        <div style={{marginTop:32,paddingTop:24,borderTop:'2px solid var(--border)'}}>
          <div style={{fontSize:13,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.14em',fontWeight:600,marginBottom:20}}>Otel Tercihleri</div>

          <div style={{marginBottom:28}}>
            <div style={{fontSize:11,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12,fontWeight:500}}>Otel sinifi</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {OTEL_TIPLERI.map(o => <Chip key={o.kod} label={o.isim} aktif={t.otel_yildizlar?.includes(o.kod)} onClick={()=>toggleOtelYildiz(o.kod)} />)}
            </div>
          </div>

          <div style={{marginBottom:28}}>
            <div style={{fontSize:11,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12,fontWeight:500}}>Otel butcesi (kisi basi / gece)</div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <input type="range" min="0" max="10000" step="250" value={t.otel_butce||2000} onChange={e=>setT(p=>({...p,otel_butce:+e.target.value}))} style={{flex:1,accentColor:'var(--success)'}} />
              <span style={{fontSize:16,fontWeight:600,minWidth:100,textAlign:'right',color:'var(--success)'}}>{(t.otel_butce||2000).toLocaleString('tr-TR')} ₺</span>
            </div>
          </div>

          <div style={{marginBottom:28}}>
            <div style={{fontSize:11,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:12,fontWeight:500}}>Konum tercihi</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {OTEL_KONUMLARI.map(k => (
                <button key={k.kod} onClick={()=>setT(p=>({...p,otel_konum:k.kod}))}
                  style={{padding:'8px 14px',borderRadius:20,fontSize:13,cursor:'pointer',fontWeight:500,
                    border:t.otel_konum===k.kod?'1px solid var(--success)':'1px solid var(--border)',
                    background:t.otel_konum===k.kod?'rgba(46,196,182,0.15)':'var(--bg3)',
                    color:t.otel_konum===k.kod?'var(--success)':'var(--text2)',transition:'all 0.15s'}}>
                  {k.isim}
                </button>
              ))}
            </div>
          </div>

          <Toggle label="Sadece kahvalti dahil oteller" sub="Kahvalti dahil filtreleme" value={t.kahvalti_dahil} onChange={()=>setT(p=>({...p,kahvalti_dahil:!p.kahvalti_dahil}))} />
        </div>
      </div>
    </div>
  )
}
