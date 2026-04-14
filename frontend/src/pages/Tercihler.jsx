import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'

const HAVAALANLARI = [
  {kod:'ADA',isim:'Adana'},{kod:'AFY',isim:'Afyon'},{kod:'ESB',isim:'Ankara'},
  {kod:'AYT',isim:'Antalya'},{kod:'EDO',isim:'Balikesir'},{kod:'BZI',isim:'Balikesir'},
  {kod:'BJV',isim:'Bodrum'},{kod:'YEI',isim:'Bursa'},{kod:'CKZ',isim:'Canakkale'},
  {kod:'DLM',isim:'Dalaman'},{kod:'DNZ',isim:'Denizli'},{kod:'DIY',isim:'Diyarbakir'},
  {kod:'EZS',isim:'Elazig'},{kod:'ERZ',isim:'Erzurum'},{kod:'GZT',isim:'Gaziantep'},
  {kod:'HTY',isim:'Hatay'},{kod:'IGD',isim:'Igdir'},{kod:'ISE',isim:'Isparta'},
  {kod:'IST',isim:'Istanbul (IST)'},{kod:'SAW',isim:'Istanbul (SAW)'},
  {kod:'ADB',isim:'Izmir'},{kod:'KSY',isim:'Kars'},{kod:'ASR',isim:'Kayseri'},
  {kod:'KYA',isim:'Konya'},{kod:'MLX',isim:'Malatya'},{kod:'MQM',isim:'Mardin'},
  {kod:'MSR',isim:'Mus'},{kod:'SZF',isim:'Samsun'},{kod:'NOP',isim:'Sinop'},
  {kod:'GNY',isim:'Sanliurfa'},{kod:'TEQ',isim:'Tekirdag'},{kod:'TZX',isim:'Trabzon'},
  {kod:'USQ',isim:'Usak'},{kod:'VAN',isim:'Van'},{kod:'ONQ',isim:'Zonguldak'},
]

const ILGI_ALANLARI = [
  {kod:'sahil',isim:'Deniz & Plaj',emoji:'🏖️'},
  {kod:'tarih',isim:'Tarih & Kultur',emoji:'🏛️'},
  {kod:'doga',isim:'Doga & Macera',emoji:'🌿'},
  {kod:'sehir',isim:'Sehir Turu',emoji:'🏙️'},
  {kod:'gastronomi',isim:'Gastronomi',emoji:'🍽️'},
  {kod:'eglence',isim:'Eglence & Gece Hayati',emoji:'🎉'},
]

const GECE_ARALIKLARI_YURTICI = [
  {kod:'1-3',isim:'1-3 gece'},{kod:'3-7',isim:'3-7 gece'},{kod:'7-10',isim:'7-10 gece'},
]

const GECE_ARALIKLARI_YURTDISI = [
  {kod:'3-5',isim:'3-5 gece'},{kod:'5-7',isim:'5-7 gece'},{kod:'7-10',isim:'7-10 gece'},
  {kod:'7-14',isim:'7-14 gece'},{kod:'14-21',isim:'14-21 gece'},{kod:'21+',isim:'21+ gece'},
]

const BOLGELER = [
  {kod:'avrupa',isim:'Avrupa'},{kod:'asya',isim:'Asya'},
  {kod:'ortadogu',isim:'Orta Dogu'},{kod:'afrika',isim:'Afrika'},
  {kod:'amerika',isim:'Amerika'},
]

const OTEL_TIPLERI = [
  {kod:5,isim:'Lux (5)'},{kod:4,isim:'Ust (4)'},{kod:3,isim:'Orta (3)'},
  {kod:2,isim:'Ekonomik (2)'},{kod:1,isim:'Butce (1)'},
  {kod:'butik',isim:'Butik'},{kod:'apart',isim:'Apart'},{kod:'hostel',isim:'Hostel'},
]

const OTEL_KONUMLARI = [
  {kod:'merkez',isim:'Sehir merkezi'},{kod:'sahil',isim:'Sahil kenari'},
  {kod:'havalimani',isim:'Havalimanina yakin'},{kod:'farketmez',isim:'Farketmez'},
]

// --- Accordion bileşeni ---
function Accordion({ emoji, baslik, badge, acik, onToggle, children }) {
  const icerikRef = useRef(null)
  const [yukseklik, setYukseklik] = useState(0)

  useEffect(() => {
    if (icerikRef.current) {
      setYukseklik(icerikRef.current.scrollHeight)
    }
  }, [acik, children])

  return (
    <div style={{borderBottom:'1px solid var(--border)'}}>
      <button onClick={onToggle} style={{
        width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'16px 0',background:'none',border:'none',cursor:'pointer',gap:10,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
          <span style={{fontSize:20,flexShrink:0}}>{emoji}</span>
          <span style={{fontSize:15,fontWeight:600,color:'var(--text)',whiteSpace:'nowrap'}}>{baslik}</span>
          {badge != null && badge !== '' && (
            <span style={{fontSize:11,color:'var(--accent)',fontWeight:500,flexShrink:0}}>({badge})</span>
          )}
        </div>
        <span style={{
          fontSize:12,color:'var(--text3)',transition:'transform 0.25s',
          transform:acik?'rotate(90deg)':'rotate(0deg)',flexShrink:0,
        }}>&#9654;</span>
      </button>
      <div style={{
        overflow:'hidden',
        maxHeight:acik?yukseklik:0,
        transition:'max-height 0.3s ease',
      }}>
        <div ref={icerikRef} style={{paddingBottom:20}}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function Tercihler({ onGeri }) {
  const [t, setT] = useState({
    cikis_havalimanlari:['IST','SAW'],maks_butce:8000,min_indirim_orani:30,
    yetiskin_sayisi:1,cocuk_var:false,cocuk_sayisi:1,cocuk_yaslari:[],
    esnek_tarih:true,direkt_ucus:false,gidis_tarihi:'',donus_tarihi:'',
    otel_yildiz:3,otel_yildizlar:[3,4],otel_butce:2000,otel_konum:'farketmez',kahvalti_dahil:false,
    min_gece:2,max_gece:7,gece_araliklari:['3-7'],donem:'farketmez',
    tercih_tipleri:[],destinasyon_tipi:'hepsi',bolgeler:[],
    paket:{ucus:true,otel:true,etkinlik:true,restoran:true,tur:true},
    bildirim_aktif:true,min_indirim_esigi:30,bildirim_sikligi:'anlik',
    yurtici_bildirim:true,yurtdisi_bildirim:true,sessiz_baslangic:'23:00',sessiz_bitis:'07:00',
  })
  const [mesaj, setMesaj] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [aciklar, setAciklar] = useState({})

  useEffect(() => {
    api.tercihGetir().then(d => { if (!d.ilk_giris && d.tercihler) setT(prev => ({...prev,...d.tercihler})) }).catch(() => {})
  }, [])

  const toggle = (key) => setAciklar(p => ({...p,[key]:!p[key]}))

  const toggleList = (alan, deger) => setT(p => {
    const liste = p[alan] || []
    return {...p, [alan]: liste.includes(deger) ? liste.filter(x=>x!==deger) : [...liste, deger]}
  })

  const kaydet = async () => {
    if (yukleniyor) return
    if (!t.cikis_havalimanlari?.length) { setMesaj('En az 1 havaalani secin'); setTimeout(()=>setMesaj(''),2000); return }
    setYukleniyor(true)
    try {
      const res = await api.tercihGuncelle(t)
      if (res.hata) { setMesaj('Hata: '+res.hata); setTimeout(()=>setMesaj(''),3000); return }
      setMesaj('Kaydedildi!')
      setTimeout(()=>{ setMesaj(''); onGeri() },1000)
    } catch {
      setMesaj('Baglanti hatasi!')
      setTimeout(()=>setMesaj(''),3000)
    } finally { setYukleniyor(false) }
  }

  // --- Yardımcı bileşenler ---
  const Chip = ({label,aktif,onClick,renk='var(--accent)'}) => (
    <button onClick={onClick} style={{
      padding:'8px 14px',borderRadius:20,fontSize:13,cursor:'pointer',fontWeight:500,
      background:aktif?renk:'var(--bg-secondary)',
      color:aktif?'#fff':'rgba(255,255,255,0.5)',
      border:aktif?`1px solid ${renk}`:'1px solid var(--border-light)',marginBottom:4,transition:'all 0.15s',
    }}>{label}</button>
  )

  const Toggle = ({label,sub,value,onChange}) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0'}}>
      <div><div style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{label}</div>{sub&&<div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{sub}</div>}</div>
      <div onClick={onChange} style={{width:46,height:26,borderRadius:13,cursor:'pointer',background:value?'var(--accent)':'rgba(255,255,255,0.1)',border:'1px solid var(--border)',position:'relative',transition:'background 0.2s',flexShrink:0}}>
        <div style={{position:'absolute',top:3,left:value?22:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}} />
      </div>
    </div>
  )

  const Counter = ({label,value,min=1,max=6,onChange}) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0'}}>
      <span style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{label}</span>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>onChange(Math.max(min,value-1))} style={{width:32,height:32,borderRadius:'50%',border:'1px solid var(--border-light)',background:'var(--bg-secondary)',color:'var(--text-primary)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>-</button>
        <span style={{fontSize:16,fontWeight:600,color:'var(--accent)',minWidth:20,textAlign:'center'}}>{value}</span>
        <button onClick={()=>onChange(Math.min(max,value+1))} style={{width:32,height:32,borderRadius:'50%',border:'1px solid var(--border-light)',background:'var(--bg-secondary)',color:'var(--text-primary)',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
      </div>
    </div>
  )

  // --- Badge hesaplamaları ---
  const havaalaniBadge = t.cikis_havalimanlari?.length ? `${t.cikis_havalimanlari.length} secili` : ''
  const butceBadge = `${t.maks_butce?.toLocaleString('tr-TR')} TL`
  const geceBadge = t.esnek_tarih
    ? ((t.gece_araliklari||[]).length ? `${(t.gece_araliklari||[]).length} aralik` : 'Esnek')
    : (t.gidis_tarihi ? `${t.gidis_tarihi}` : 'Tarih sec')
  const destBadge = t.destinasyon_tipi==='yurtici'?'Yurtici':t.destinasyon_tipi==='yurtdisi'?'Yurtdisi':(t.bolgeler||[]).length?`${(t.bolgeler||[]).length} bolge`:'Hepsi'
  const ilgiBadge = (t.tercih_tipleri||[]).length ? `${(t.tercih_tipleri||[]).length} secili` : ''
  const yolcuBadge = `${t.yetiskin_sayisi} yetiskin${t.cocuk_var?` + cocuk`:''}`
  const bildirimBadge = t.bildirim_aktif ? 'Acik' : 'Kapali'

  return (
    <div className="page-constrained" style={{minHeight:'100vh',background:'var(--bg)',paddingBottom:80}}>
      {/* Header */}
      <div style={{padding:'56px 20px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <button onClick={onGeri} style={{background:'var(--bg-secondary)',border:'1px solid var(--border-light)',borderRadius:10,padding:'8px 14px',color:'var(--text-secondary)',cursor:'pointer',fontSize:13,fontWeight:500,boxShadow:'none'}}>Geri</button>
        <h2 style={{fontSize:18,fontWeight:500,color:'var(--text)'}}>Dedektif Gezgin Tercihlerim</h2>
        <div style={{width:60}} />
      </div>

      {/* Accordion bölümleri */}
      <div style={{padding:'0 20px'}}>

        {/* 1. Kalkış Havalimanları */}
        <Accordion emoji="✈️" baslik="Kalkis Havalimanlari" badge={havaalaniBadge} acik={aciklar.hava} onToggle={()=>toggle('hava')}>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10,gap:8}}>
            <button onClick={()=>setT(p=>({...p,cikis_havalimanlari:HAVAALANLARI.map(h=>h.kod)}))}
              style={{fontSize:12,color:'var(--accent)',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>Tumunu sec</button>
            <span style={{color:'var(--text3)'}}>|</span>
            <button onClick={()=>setT(p=>({...p,cikis_havalimanlari:[]}))}
              style={{fontSize:12,color:'var(--text2)',background:'none',border:'none',cursor:'pointer',fontWeight:500}}>Temizle</button>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {HAVAALANLARI.map(h=><Chip key={h.kod} label={h.isim} aktif={t.cikis_havalimanlari?.includes(h.kod)} onClick={()=>toggleList('cikis_havalimanlari',h.kod)} />)}
          </div>
        </Accordion>

        {/* 2. Bütçe */}
        <Accordion emoji="💰" baslik="Butce" badge={butceBadge} acik={aciklar.butce} onToggle={()=>toggle('butce')}>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Maksimum butce (kisi basi)</div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <input type="range" min="1000" max="30000" step="500" value={t.maks_butce}
                onChange={e=>setT(p=>({...p,maks_butce:+e.target.value}))}
                style={{flex:1,accentColor:'var(--accent)'}} />
              <span style={{fontSize:16,fontWeight:600,minWidth:100,textAlign:'right',color:'var(--accent)'}}>
                {t.maks_butce?.toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>
          <div>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Minimum indirim orani</div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <input type="range" min="10" max="70" step="5" value={t.min_indirim_orani}
                onChange={e=>setT(p=>({...p,min_indirim_orani:+e.target.value}))}
                style={{flex:1,accentColor:'var(--accent2)'}} />
              <span style={{fontSize:16,fontWeight:600,minWidth:50,color:'var(--accent2)'}}>%{t.min_indirim_orani}</span>
            </div>
          </div>
        </Accordion>

        {/* 3. Seyahat Tarihleri */}
        <Accordion emoji="📅" baslik="Seyahat Tarihleri" badge={geceBadge} acik={aciklar.tarih} onToggle={()=>toggle('tarih')}>
          <Toggle label="Esnek tarih" sub={t.esnek_tarih ? "Tarih fark etmez, gece sayisi ve doneme gore filtrele" : "Belirli tarih araliginda fırsatları goster"}
            value={t.esnek_tarih} onChange={()=>setT(p=>({...p,esnek_tarih:!p.esnek_tarih}))} />

          {!t.esnek_tarih ? (
            <div style={{marginTop:16}}>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Gidis tarihi</div>
                <input type="date" value={t.gidis_tarihi||''} min={new Date().toISOString().split('T')[0]}
                  onChange={e=>{
                    const gidis = e.target.value
                    setT(p=>({...p, gidis_tarihi:gidis, donus_tarihi: p.donus_tarihi && p.donus_tarihi < gidis ? '' : p.donus_tarihi}))
                  }}
                  style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1px solid var(--border-light)',background:'var(--bg-secondary)',color:'var(--text-primary)',fontSize:15,boxSizing:'border-box'}} />
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Donus tarihi</div>
                <input type="date" value={t.donus_tarihi||''} min={t.gidis_tarihi||new Date().toISOString().split('T')[0]}
                  onChange={e=>setT(p=>({...p,donus_tarihi:e.target.value}))}
                  style={{width:'100%',padding:'12px 14px',borderRadius:12,border:'1px solid var(--border-light)',background:'var(--bg-secondary)',color:'var(--text-primary)',fontSize:15,boxSizing:'border-box'}} />
              </div>
              {t.gidis_tarihi && t.donus_tarihi && (
                <div style={{padding:'10px 14px',borderRadius:10,background:'rgba(255,92,26,0.12)',border:'1px solid rgba(255,92,26,0.25)',marginBottom:12}}>
                  <span style={{fontSize:13,color:'var(--accent)'}}>
                    {(() => {
                      const g = new Date(t.gidis_tarihi), d = new Date(t.donus_tarihi)
                      const gece = Math.round((d - g) / 86400000)
                      const gidisStr = g.toLocaleDateString('tr-TR', {day:'numeric',month:'short'})
                      const donusStr = d.toLocaleDateString('tr-TR', {day:'numeric',month:'short'})
                      return `${gidisStr} — ${donusStr} (${gece} gece)`
                    })()}
                  </span>
                  <span style={{fontSize:11,color:'var(--text3)',marginLeft:8}}>±1 gun tolerans</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{marginTop:16,marginBottom:16}}>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Yurtici — kac gece</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}}>
                  {GECE_ARALIKLARI_YURTICI.map(g=><Chip key={g.kod} label={g.isim} aktif={(t.gece_araliklari||[]).includes(g.kod)} onClick={()=>toggleList('gece_araliklari',g.kod)} />)}
                </div>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Yurtdisi — kac gece</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {GECE_ARALIKLARI_YURTDISI.map(g=><Chip key={g.kod} label={g.isim} aktif={(t.gece_araliklari||[]).includes(g.kod)} onClick={()=>toggleList('gece_araliklari',g.kod)} />)}
                </div>
              </div>
              <div>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Donem</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {[{v:'haftasonu',l:'Hafta sonu'},{v:'haftaici',l:'Hafta ici'},{v:'farketmez',l:'Fark etmez'}].map(o=>(
                    <Chip key={o.v} label={o.l} aktif={t.donem===o.v} onClick={()=>setT(p=>({...p,donem:o.v}))} />
                  ))}
                </div>
              </div>
            </>
          )}
          <Toggle label="Sadece direkt ucuslar" value={t.direkt_ucus} onChange={()=>setT(p=>({...p,direkt_ucus:!p.direkt_ucus}))} />
        </Accordion>

        {/* 4. Destinasyon Tercihleri */}
        <Accordion emoji="🌍" baslik="Destinasyon" badge={destBadge} acik={aciklar.dest} onToggle={()=>toggle('dest')}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Nereye gitmek istersiniz?</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {[{v:'yurtici',l:'Yurtici'},{v:'yurtdisi',l:'Yurtdisi'},{v:'hepsi',l:'Her ikisi'}].map(o=>(
                <Chip key={o.v} label={o.l} aktif={t.destinasyon_tipi===o.v} onClick={()=>setT(p=>({...p,destinasyon_tipi:o.v}))} />
              ))}
            </div>
          </div>
          {t.destinasyon_tipi!=='yurtici' && (
            <div>
              <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Bolge filtresi</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {BOLGELER.map(b=><Chip key={b.kod} label={b.isim} aktif={(t.bolgeler||[]).includes(b.kod)} onClick={()=>toggleList('bolgeler',b.kod)} />)}
              </div>
            </div>
          )}
        </Accordion>

        {/* 5. İlgi Alanları */}
        <Accordion emoji="🎯" baslik="Ilgi Alanlari" badge={ilgiBadge} acik={aciklar.ilgi} onToggle={()=>toggle('ilgi')}>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {ILGI_ALANLARI.map(a=>(
              <Chip key={a.kod} label={`${a.emoji} ${a.isim}`} aktif={(t.tercih_tipleri||[]).includes(a.kod)} onClick={()=>toggleList('tercih_tipleri',a.kod)} />
            ))}
          </div>
        </Accordion>

        {/* 6. Yolcu Bilgisi */}
        <Accordion emoji="👥" baslik="Yolcu Bilgisi" badge={yolcuBadge} acik={aciklar.yolcu} onToggle={()=>toggle('yolcu')}>
          <Counter label="Yetiskin sayisi" value={t.yetiskin_sayisi||1} min={1} max={6}
            onChange={v=>setT(p=>({...p,yetiskin_sayisi:v}))} />
          <Toggle label="Cocuklu seyahat" sub="Aile dostu oneriler" value={t.cocuk_var} onChange={()=>setT(p=>({...p,cocuk_var:!p.cocuk_var}))} />
          {t.cocuk_var && (
            <Counter label="Cocuk sayisi" value={t.cocuk_sayisi||1} min={1} max={4}
              onChange={v=>setT(p=>({...p,cocuk_sayisi:v}))} />
          )}
        </Accordion>

        {/* 7. Otel Tercihleri */}
        <Accordion emoji="🏨" baslik="Otel Tercihleri" badge={`${(t.otel_yildizlar||[]).length} sinif`} acik={aciklar.otel} onToggle={()=>toggle('otel')}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Otel sinifi</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {OTEL_TIPLERI.map(o=><Chip key={o.kod} label={o.isim} aktif={(t.otel_yildizlar||[]).includes(o.kod)} onClick={()=>toggleList('otel_yildizlar',o.kod)} renk="var(--success)" />)}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Otel butcesi (kisi basi / gece)</div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <input type="range" min="0" max="10000" step="250" value={t.otel_butce||2000}
                onChange={e=>setT(p=>({...p,otel_butce:+e.target.value}))}
                style={{flex:1,accentColor:'var(--success)'}} />
              <span style={{fontSize:16,fontWeight:600,minWidth:100,textAlign:'right',color:'var(--success)'}}>
                {(t.otel_butce||2000).toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Konum tercihi</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {OTEL_KONUMLARI.map(k=><Chip key={k.kod} label={k.isim} aktif={t.otel_konum===k.kod} onClick={()=>setT(p=>({...p,otel_konum:k.kod}))} renk="var(--success)" />)}
            </div>
          </div>
          <Toggle label="Sadece kahvalti dahil" sub="Kahvalti dahil filtreleme" value={t.kahvalti_dahil} onChange={()=>setT(p=>({...p,kahvalti_dahil:!p.kahvalti_dahil}))} />
        </Accordion>

        {/* 8. Bildirim Ayarları */}
        <Accordion emoji="🔔" baslik="Bildirim Ayarlari" badge={bildirimBadge} acik={aciklar.bildirim} onToggle={()=>toggle('bildirim')}>
          <Toggle label="Bildirimleri ac/kapat" sub="Firsat bildirimleri gonderilsin mi" value={t.bildirim_aktif} onChange={()=>setT(p=>({...p,bildirim_aktif:!p.bildirim_aktif}))} />
          {t.bildirim_aktif && (<>
            <div style={{marginTop:12,marginBottom:16}}>
              <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Minimum indirim esigi</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {[{v:20,l:'%20+'},{v:30,l:'%30+'},{v:40,l:'%40+'},{v:50,l:'%50+'}].map(o=>(
                  <Chip key={o.v} label={o.l} aktif={t.min_indirim_esigi===o.v} onClick={()=>setT(p=>({...p,min_indirim_esigi:o.v}))} />
                ))}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Bildirim sikligi</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {[{v:'anlik',l:'Anlik'},{v:'gunde_1',l:'Gunde 1 kez'},{v:'gunde_3',l:'Gunde 3 kez'}].map(o=>(
                  <Chip key={o.v} label={o.l} aktif={t.bildirim_sikligi===o.v} onClick={()=>setT(p=>({...p,bildirim_sikligi:o.v}))} />
                ))}
              </div>
            </div>
            <Toggle label="Yurtici firsatlar" sub="Turkiye ici ucus firsatlari" value={t.yurtici_bildirim} onChange={()=>setT(p=>({...p,yurtici_bildirim:!p.yurtici_bildirim}))} />
            <Toggle label="Yurtdisi firsatlar" sub="Yurtdisi ucus firsatlari" value={t.yurtdisi_bildirim} onChange={()=>setT(p=>({...p,yurtdisi_bildirim:!p.yurtdisi_bildirim}))} />
            <div style={{marginTop:12}}>
              <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Sessiz saatler</div>
              <div style={{fontSize:11,color:'var(--text3)',marginBottom:8}}>Bu saatler arasinda bildirim gelmez</div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <input type="time" value={t.sessiz_baslangic||'23:00'} onChange={e=>setT(p=>({...p,sessiz_baslangic:e.target.value}))}
                  style={{padding:'8px 12px',borderRadius:10,border:'1px solid var(--border-light)',background:'var(--bg-secondary)',color:'var(--text-primary)',fontSize:14}} />
                <span style={{color:'var(--text3)',fontSize:13}}>—</span>
                <input type="time" value={t.sessiz_bitis||'07:00'} onChange={e=>setT(p=>({...p,sessiz_bitis:e.target.value}))}
                  style={{padding:'8px 12px',borderRadius:10,border:'1px solid var(--border-light)',background:'var(--bg-secondary)',color:'var(--text-primary)',fontSize:14}} />
              </div>
            </div>
          </>)}
        </Accordion>

      </div>

      {/* Sticky Kaydet butonu */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,
        padding:'12px 20px',
        background:'var(--bg)',borderTop:'1px solid var(--border)',
        boxShadow:'0 -2px 12px rgba(0,0,0,0.3)',
        backdropFilter:'blur(12px)',
        zIndex:100,
      }}>
        <button onClick={kaydet} disabled={yukleniyor} style={{
          width:'100%',padding:'14px',borderRadius:12,border:'none',fontSize:15,fontWeight:600,
          cursor:yukleniyor?'wait':'pointer',
          background:mesaj==='Kaydedildi!'?'var(--success)':mesaj&&mesaj!=='Kaydediliyor...'?'#c0392b':'var(--accent)',
          color:'#fff',opacity:yukleniyor?0.7:1,transition:'all 0.2s',
        }}>
          {mesaj||(yukleniyor?'Kaydediliyor...':'Kaydet')}
        </button>
      </div>
    </div>
  )
}
