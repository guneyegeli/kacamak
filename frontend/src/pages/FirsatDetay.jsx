import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { generateAllLinks, openAffiliate } from '../utils/affiliateLinks'
import YURTICI_KODLARI from '../utils/yurticiKodlari'
import trackAffiliateClick from '../utils/trackAffiliate'

const isMobile = window.innerWidth < 768

const CIKIS_SEHIRLERI = {
  IST:'İstanbul',SAW:'İstanbul',ADB:'İzmir',AYT:'Antalya',ESB:'Ankara',
  ADA:'Adana',TZX:'Trabzon',GZT:'Gaziantep',BJV:'Bodrum',DLM:'Dalaman',
  SZF:'Samsun',ERZ:'Erzurum',VAN:'Van',DIY:'Diyarbakır',KYA:'Konya',
  MLX:'Malatya',EZS:'Elazığ',ASR:'Kayseri',HTY:'Hatay',GNY:'Şanlıurfa',
  MQM:'Mardin',IGD:'Iğdır',MSR:'Muş',KSY:'Kars',EDO:'Balıkesir',
  DNZ:'Denizli',ISE:'Isparta',NOP:'Sinop',ONQ:'Zonguldak',
  CKZ:'Çanakkale',TEQ:'Tekirdağ',USQ:'Uşak',AFY:'Afyon',BZI:'Balıkesir',YEI:'Bursa',
}

const HAVAYOLU_ADLARI = {
  TK: 'Türk Hava Yolları', PC: 'Pegasus', XQ: 'SunExpress',
  W6: 'Wizz Air', FR: 'Ryanair', A3: 'Aegean', DP: 'Pobeda',
  A4: 'Azimuth', '5F': 'FlyOne', VF: 'Flynas', TO: 'Transavia',
  GQ: 'Sky Express', U2: 'easyJet', LH: 'Lufthansa', BA: 'British Airways',
  AF: 'Air France', KL: 'KLM', OS: 'Austrian', LX: 'Swiss',
  AZ: 'ITA Airways', QR: 'Qatar Airways', EK: 'Emirates', EY: 'Etihad',
  TG: 'Thai Airways', SQ: 'Singapore Airlines',
}
const BAGAJ_23KG = new Set(['TK', 'LH', 'BA', 'AF', 'KL', 'OS', 'LX', 'AZ', 'QR', 'EK', 'EY', 'TG', 'SQ', 'A3'])
const BAGAJ_KABIN = new Set(['PC', 'W6', 'FR', 'U2', 'DP', 'GQ', '5F'])

const aktarmaBilgi = (f) => {
  if (!f) return { ikon: '✈️', yazi: null, renk: 'var(--text-muted)' }
  if (f.aktarma > 0) return { ikon: '🔄', yazi: f.aktarma === 1 ? '1 aktarma' : `${f.aktarma} aktarma`, renk: 'var(--accent-amber)' }
  if (f.aktarma === 0 && f.sure_dk > 0) return { ikon: '✈️', yazi: 'Direkt uçuş', renk: 'var(--accent-green)' }
  return { ikon: '✈️', yazi: 'Sitede kontrol edin', renk: 'var(--text-muted)' }
}

const sureBilgisi = (dk) => {
  if (!dk || dk <= 0) return null
  const tekYon = Math.round(dk / 2)
  const s = Math.floor(tekYon / 60)
  const m = tekYon % 60
  return `${s}s${m > 0 ? ` ${m}dk` : ''}`
}

const bagajDetay = (havayolu) => {
  if (havayolu === 'TK') return 'Genellikle 1 adet 23kg bagaj dahil'
  if (havayolu === 'PC') return 'Genellikle el bagajı dahil, hold bagajı ekstra'
  if (havayolu === 'XQ') return 'Genellikle el bagajı dahil, hold bagajı ekstra'
  if (!havayolu) return 'Bagaj bilgisi için bilet sitesini kontrol edin'
  if (BAGAJ_23KG.has(havayolu)) return 'Genellikle 23kg bagaj dahil'
  if (BAGAJ_KABIN.has(havayolu)) return 'Genellikle el bagajı dahil, hold bagajı ekstra'
  return 'Bagaj bilgisi için bilet sitesini kontrol edin'
}

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


const ULKE_ADLARI = {
  BCN: 'İspanya', MAD: 'İspanya', TCI: 'İspanya',
  PAR: 'Fransa', CDG: 'Fransa', ORY: 'Fransa',
  LHR: 'İngiltere', LON: 'İngiltere', LGW: 'İngiltere', STN: 'İngiltere', LTN: 'İngiltere',
  BER: 'Almanya', TXL: 'Almanya', MUC: 'Almanya', FRA: 'Almanya',
  DUS: 'Almanya', HAM: 'Almanya', STR: 'Almanya', CGN: 'Almanya',
  NUE: 'Almanya', HAJ: 'Almanya', BRE: 'Almanya', LEJ: 'Almanya', DTM: 'Almanya',
  ROM: 'İtalya', FCO: 'İtalya', CIA: 'İtalya', MXP: 'İtalya', BGY: 'İtalya',
  AMS: 'Hollanda', PRG: 'Çekya', BUD: 'Macaristan', VIE: 'Avusturya',
  ATH: 'Yunanistan', LIS: 'Portekiz', WAW: 'Polonya', ZAG: 'Hırvatistan',
  BEG: 'Sırbistan', SOF: 'Bulgaristan', OTP: 'Romanya', SKP: 'Kuzey Makedonya',
  TIA: 'Arnavutluk', SJJ: 'Bosna Hersek', DUB: 'İrlanda', CPH: 'Danimarka',
  OSL: 'Norveç', ARN: 'İsveç', HEL: 'Finlandiya', ZRH: 'İsviçre', BRU: 'Belçika',
  TGD: 'Karadağ', TIV: 'Karadağ',
  TBS: 'Gürcistan', GYD: 'Azerbaycan', BAK: 'Azerbaycan', GNJ: 'Azerbaycan',
  EVN: 'Ermenistan', TLV: 'İsrail', AMM: 'Ürdün', BEY: 'Lübnan',
  DXB: 'BAE', DOH: 'Katar',
  JED: 'Suudi Arabistan', MED: 'Suudi Arabistan', RUH: 'Suudi Arabistan',
  MCT: 'Umman', BAH: 'Bahreyn', KWI: 'Kuveyt',
  CAI: 'Mısır', SSH: 'Mısır', HRG: 'Mısır', CMN: 'Fas', RAK: 'Fas', TUN: 'Tunus',
  ECN: 'KKTC', LCA: 'Kıbrıs', PFO: 'Kıbrıs',
  MOW: 'Rusya', SVO: 'Rusya', VKO: 'Rusya', DME: 'Rusya',
  LED: 'Rusya', AER: 'Rusya', KRR: 'Rusya', RMO: 'Rusya', ROV: 'Rusya', VOZ: 'Rusya',
  KZN: 'Rusya', SVX: 'Rusya', MRV: 'Rusya', MCX: 'Rusya', GRV: 'Rusya',
  OGZ: 'Rusya', CEK: 'Rusya', UFA: 'Rusya', PEE: 'Rusya', GOJ: 'Rusya',
  OMS: 'Rusya', KJA: 'Rusya', TJM: 'Rusya', KGD: 'Rusya', RTW: 'Rusya',
  OVB: 'Rusya', KUF: 'Rusya',
  TAS: 'Özbekistan', SKD: 'Özbekistan', BSZ: 'Kırgızistan', OSS: 'Kırgızistan',
  NQZ: 'Kazakistan', ALA: 'Kazakistan', CIT: 'Kazakistan', MSQ: 'Belarus',
  BKK: 'Tayland', HKT: 'Tayland', SIN: 'Singapur', KUL: 'Malezya',
  MNL: 'Filipinler', DPS: 'Endonezya',
  HND: 'Japonya', NRT: 'Japonya', ICN: 'Güney Kore',
  PEK: 'Çin', PVG: 'Çin', HKG: 'Hong Kong',
  DEL: 'Hindistan', BOM: 'Hindistan', CMB: 'Sri Lanka',
  JFK: 'ABD', MIA: 'ABD', LAX: 'ABD', SFO: 'ABD', ORD: 'ABD', ATL: 'ABD',
  YYZ: 'Kanada', MEX: 'Meksika', CUN: 'Meksika',
  GRU: 'Brezilya', GIG: 'Brezilya', EZE: 'Arjantin',
  SYD: 'Avustralya', MEL: 'Avustralya', AKL: 'Yeni Zelanda',
  CPT: 'Güney Afrika', NBO: 'Kenya', MRU: 'Mauritius', SEZ: 'Seyşeller',
  MLE: 'Maldivler',
  BTS: 'Slovakya', PRN: 'Kosova', NAP: 'İtalya', MRS: 'Fransa',
  RTM: 'Hollanda', POZ: 'Polonya', ABZ: 'İngiltere', BUH: 'Romanya',
  TYO: 'Japonya', CJU: 'Güney Kore', IKT: 'Rusya', FEG: 'Özbekistan',
  SHJ: 'BAE',
  NYC: 'ABD', SEL: 'Güney Kore', BJS: 'Çin', SHA: 'Çin',
  RIO: 'Brezilya', SAO: 'Brezilya', BUE: 'Arjantin',
  MIL: 'İtalya', CHI: 'ABD',
  GVA: 'İsviçre', JTR: 'Yunanistan', BOG: 'Kolombiya',
  LIM: 'Peru', SCL: 'Şili', CAN: 'Çin', BUS: 'Gürcistan',
}

const ulkeEkle = (sehirAd, varisKod) => {
  if (YURTICI_KODLARI.has(varisKod)) return sehirAd
  const ulke = ULKE_ADLARI[varisKod]
  return ulke ? `${sehirAd}, ${ulke}` : sehirAd
}

const trToAscii = (s) => s
  .replace(/ö/g,'o').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ç/g,'c')
  .replace(/ğ/g,'g').replace(/ı/g,'i').replace(/Ö/g,'O').replace(/Ü/g,'U')
  .replace(/Ş/g,'S').replace(/Ç/g,'C').replace(/Ğ/g,'G').replace(/İ/g,'I')

const encodeQuery = (text) => encodeURIComponent(trToAscii(text))

function _yolcuOku() {
  try { const s = localStorage.getItem('kacamak_yolcu'); if (s) return JSON.parse(s) } catch {}
  return { yetiskin: 1, cocuk: 0, bebek: 0 }
}

export default function FirsatDetay({ firsat, onGeri, onFirsat }) {
  const [yolcu] = useState(_yolcuOku)
  const [detay, setDetay] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [foto, setFoto] = useState(null)
  const [galeri, setGaleri] = useState([])
  const [aktiviteler, setAktiviteler] = useState([])
  const [harita, setHarita] = useState(null)
  const [benzer, setBenzer] = useState([])
  const [altTarihler, setAltTarihler] = useState([])
  const [buyukFoto, setBuyukFoto] = useState(null)
  const [kanalVideo, setKanalVideo] = useState(null)

  const [itUretiliyor, setItUretiliyor] = useState(false)
  const [detayHata, setDetayHata] = useState(null)
  const [otelLinkler, setOtelLinkler] = useState(null)
  const [canliFiyat, setCanliFiyat] = useState(null)
  const [canliFiyatYukleniyor, setCanliFiyatYukleniyor] = useState(false)

  useEffect(() => {
    if (!firsat?.id) return
    setDetay(null); setYukleniyor(true); setItUretiliyor(false); setDetayHata(null)
    setFoto(null); setGaleri([]); setBenzer([]); setAltTarihler([]); setKanalVideo(null)
    setCanliFiyat(null); setCanliFiyatYukleniyor(true)
    if (firsat.cikis && firsat.varis && firsat.ucus_tarihi) {
      api.canliFiyat({ cikis: firsat.cikis, varis: firsat.varis, gidis: firsat.ucus_tarihi, donus: firsat.donus_tarihi, yetiskin: yolcu.yetiskin || 1 })
        .then(r => { if (r?.canli_fiyat) setCanliFiyat(r) })
        .catch(() => {})
        .finally(() => setCanliFiyatYukleniyor(false))
    } else { setCanliFiyatYukleniyor(false) }
    api.firsatDetay(firsat.id).then(d => {
      setDetay(d)
      // Itinerary yoksa otomatik üret
      if (!d?.paket) {
        setItUretiliyor(true)
        api.itineraryOlustur(firsat.id).then(sonuc => {
          if (sonuc?.paket) {
            setDetay(prev => ({ ...prev, paket: sonuc.paket }))
          }
        }).catch(() => {}).finally(() => setItUretiliyor(false))
      }
    }).catch(() => setDetayHata('Fırsat detayı yüklenemedi.')).finally(() => setYukleniyor(false))
    api.foto(firsat.varis).then(f => { if (f?.length) setFoto(f[0]) }).catch(() => {})
    api.galeri(firsat.varis, 4).then(setGaleri).catch(() => setGaleri([]))
    api.aktiviteler(firsat.varis).then(setAktiviteler).catch(() => setAktiviteler([]))
    api.harita(firsat.varis).then(setHarita).catch(() => setHarita(null))
    api.kanalVideo(firsat.varis).then(v => { if (v) setKanalVideo(v) }).catch(() => {})
    api.benzerFirsatlar(firsat.id).then(setBenzer).catch(() => setBenzer([]))
    api.alternatifTarihler(firsat.id).then(setAltTarihler).catch(() => setAltTarihler([]))
    // Otel arama linkleri al
    setOtelLinkler(null)
    if (firsat.varis_sehir && firsat.ucus_tarihi && firsat.donus_tarihi) {
      api.otelAra({
        sehir: firsat.varis_sehir,
        checkin: firsat.ucus_tarihi,
        checkout: firsat.donus_tarihi,
        yetiskin: yolcu.yetiskin || 2,
        cocuk: yolcu.cocuk || 0,
      }).then(r => setOtelLinkler(r.linkler || null)).catch(() => {})
    }
  }, [firsat])

  const it = detay?.paket
  const mk = import.meta.env.VITE_TRAVELPAYOUTS_MARKER
  const o = firsat?.cikis || '', d = firsat?.varis || ''
  const cikisSehir = CIKIS_SEHIRLERI[o] || o
  const sehirAd = firsat?.varis_sehir || firsat?.varis
  const sehir = ulkeEkle(sehirAd, firsat?.varis)
  const cs = { background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }
  const lbl = { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 12 }

  const gidisTarih = firsat?.ucus_tarihi || ''
  const donusTarih = firsat?.donus_tarihi || ''
  const tarihBilgi = `${tarihFormat(gidisTarih)} - ${tarihFormat(donusTarih)}`
  const fiyatGosterim = firsat?.fiyat?.toLocaleString('tr-TR')
  const links = generateAllLinks(o, d, gidisTarih, donusTarih, yolcu)
  const yolcuParam = `&adults=${yolcu.yetiskin}${yolcu.cocuk ? `&children=${yolcu.cocuk}&childrenAges=${new Array(yolcu.cocuk).fill(8).join(',')}` : ''}${yolcu.bebek ? `&infants=${yolcu.bebek}` : ''}`
  const hotellookLink = `https://search.hotellook.com/?destination=${encodeURIComponent(sehirAd)}&checkIn=${gidisTarih}&checkOut=${donusTarih}${yolcuParam}&marker=${mk}&locale=tr&currency=try`
  const platformlar = [
    { isim: 'Aviasales', fiyatYazi: `${fiyatGosterim} ₺'den başlayan fiyatlar`, buton: 'Sitede güncel fiyatı gör', emoji: '🔥', renk: '#FF5C1A', link: links.aviasales },
    { isim: 'Skyscanner', fiyatYazi: 'Fiyatları karşılaştır →', buton: 'Sitede güncel fiyatı gör', emoji: '🔍', renk: '#00B2E2', link: links.skyscanner },
    { isim: 'Kiwi.com', fiyatYazi: 'Esnek arama yap →', buton: 'Sitede güncel fiyatı gör', emoji: '🌍', renk: '#00A991', link: links.kiwi },
  ]

  const GunKart = ({ gun }) => {
    const zz = gun.sabah && typeof gun.sabah === 'object'
      ? [['Sabah', gun.sabah], ['Ogle', gun.ogle], ['Aksam', gun.aksam]]
      : [['Sabah', { aktivite: gun.sabah, emoji: '🌅' }], ['Ogle', { aktivite: gun.ogle, emoji: '☀️' }], ['Aksam', { aktivite: gun.aksam, emoji: '🌙' }]]
    return (
      <div style={{ ...cs, borderLeft: '3px solid var(--accent-orange)', padding: 20, marginBottom: 12, overflow: 'hidden', maxWidth: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{gun.emoji || '📍'} Gun {gun.gun}</div>
            <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>{gun.tema}</div>
          </div>
          {gun.gun_toplam_eur && <div style={{ background: 'rgba(255,92,26,0.15)', borderRadius: 8, padding: '6px 10px' }}><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-orange)' }}>~€{gun.gun_toplam_eur}</div></div>}
        </div>
        {zz.map(([zaman, ic]) => (
          <div key={zaman} style={{ marginBottom: 14, paddingLeft: 14, borderLeft: '2px solid var(--accent-orange)' }}>
            <div style={{ fontSize: 14, color: 'var(--accent-amber)', marginBottom: 6, fontWeight: 500 }}>{ic?.emoji || '🕐'} {zaman}</div>
            {typeof ic === 'object' ? (<>
              <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 500, marginBottom: 2, wordBreak: 'break-word', maxWidth: '100%' }}>
                {ic.google_maps_link
                  ? <a href={ic.google_maps_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--accent-green)', textDecoration: 'underline', textUnderlineOffset: 2, wordBreak: 'break-word' }}>{ic.aktivite}</a>
                  : <span style={{ color: 'var(--text-primary)' }}>{ic.aktivite}</span>}
              </div>
              {ic.detay && <div style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6, fontStyle: 'italic' }}>{ic.detay}</div>}
              {ic.restoran && <div style={{ fontSize: 15, marginBottom: 4 }}>🍽️ {ic.restoran_maps_link
                ? <a href={ic.restoran_maps_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--accent-green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{ic.restoran}</a>
                : <span style={{ color: 'var(--accent-green)' }}>{ic.restoran}</span>}
              </div>}
              <div style={{ display: 'flex', gap: isMobile ? 6 : 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {ic.ulasim && <span style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: '100%' }}>🚌 {ic.ulasim}</span>}
                {ic.harcama_eur != null && <span style={{ fontSize: 14, color: 'var(--accent-orange)' }}>💰 €{ic.harcama_eur}</span>}
                {ic.aktivite && !YURTICI_KODLARI.has(firsat?.varis) && (
                  <span onClick={e => { e.stopPropagation(); openAffiliate(`https://www.getyourguide.com/s/?q=${encodeQuery(ic.aktivite + ' ' + sehirAd)}`) }} style={{ fontSize: 13, color: 'var(--accent-orange)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>🎟️ GetYourGuide'da ara →</span>
                )}
              </div>
            </>) : <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ic?.aktivite || ic}</div>}
          </div>
        ))}
        {gun.ipucu && <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: '10px 12px', marginTop: 4 }}><div style={{ fontSize: 14, color: 'var(--accent-amber)', lineHeight: 1.5 }}>💡 {gun.ipucu}</div></div>}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-tertiary)', paddingBottom: 80, overflowX: 'hidden' }}>
      {/* HERO — full width 100vw */}
      <div style={{ position: 'relative', width: '100vw', marginLeft: 'calc(-50vw + 50%)', height: 320, overflow: 'hidden', background: foto ? undefined : 'linear-gradient(135deg, #1e293b 0%, #334155 40%, #FF5C1A 100%)' }}>
        {foto && <img src={foto.url_orta} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: foto ? 'linear-gradient(transparent 30%, rgba(0,0,0,0.7))' : 'radial-gradient(circle at 70% 30%, rgba(255,92,26,0.2) 0%, transparent 60%)' }} />
        <button onClick={onGeri} onMouseEnter={e => e.currentTarget.style.background='rgba(13,27,42,0.95)'} onMouseLeave={e => e.currentTarget.style.background='rgba(13,27,42,0.85)'} style={{ position: 'fixed', top: 60, left: 16, background: 'rgba(13,27,42,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '10px 20px', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600, zIndex: 100, transition: 'background 0.2s' }}><span style={{ fontSize: 18, marginRight: 6 }}>‹</span>Geri</button>
        <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28 }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: 6 }}>{cikisSehir} ({o}) → {sehir} ({d}) · {tarihFormat(firsat?.ucus_tarihi)}{firsat?.donus_tarihi ? ` → ${tarihFormat(firsat.donus_tarihi)}` : ''}{geceSay(firsat?.ucus_tarihi, firsat?.donus_tarihi) ? ` (${geceSay(firsat.ucus_tarihi, firsat.donus_tarihi)} gece)` : ''}</div>
          <div style={{ fontSize: 36, fontWeight: 500, color: '#fff' }}>{sehir}</div>
        </div>
        {foto?.fotograf && <div style={{ position: 'absolute', bottom: 8, right: 28, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>📷 {foto.fotograf}</div>}
      </div>

      {/* 3-KOLON LAYOUT */}
      <div className="detay-cols">

        {/* === SOL KOLON === */}
        <div className="detay-col-sol">
          {/* Harita */}
          {harita?.embed_url && (
            <div style={{ marginBottom: 20 }}>
              <div style={lbl}>🗺️ Harita — {harita.isim}</div>
              <div style={{ ...cs, overflow: 'hidden', borderRadius: 12 }}>
                <iframe src={harita.embed_url} style={{ width: '100%', height: 300, border: 'none' }} title="Harita" loading="lazy" />
              </div>
            </div>
          )}

          {/* Pratik bilgiler */}
          {it?.pratik && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, fontWeight: 500 }}>📋 Sehir Rehberi</div>
              {it.pratik.ulasim && <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>🚌 <strong style={{ color: 'var(--text-primary)' }}>Ulaşım:</strong> {it.pratik.ulasim}</div>}
              {it.pratik.konaklama_bolgeleri && <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>🏨 <strong style={{ color: 'var(--text-primary)' }}>Konaklama:</strong> {it.pratik.konaklama_bolgeleri}</div>}
              {!YURTICI_KODLARI.has(firsat?.varis) && it.pratik.para && <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>💰 <strong style={{ color: 'var(--text-primary)' }}>Para:</strong> {it.pratik.para}</div>}
              {!YURTICI_KODLARI.has(firsat?.varis) && it.pratik.dil && <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>🗣️ <strong style={{ color: 'var(--text-primary)' }}>Dil:</strong> {it.pratik.dil}</div>}
              {!YURTICI_KODLARI.has(firsat?.varis) && it.pratik.guvenlik && <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>🛡️ <strong style={{ color: 'var(--text-primary)' }}>Güvenlik:</strong> {it.pratik.guvenlik}</div>}
              {it.pratik.ipuclari?.map((ip, i) => <div key={i} style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.6 }}>💡 {ip}</div>)}
            </div>
          )}

          {/* Galeri */}
          {galeri.length >= 2 && (
            <div style={{ marginBottom: 20 }}>
              <div style={lbl}>📸 Fotograflar</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {galeri.slice(0, 4).map((f, i) => (
                  <div key={i} onClick={() => setBuyukFoto(f)} style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer', aspectRatio: '4/3', border: '1px solid var(--border-color)' }}>
                    <img src={f.url_kucuk} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* === ORTA KOLON (ANA ICERIK) === */}
        <div className="detay-col-orta">
          {/* Fiyat */}
          {(() => {
            const geceS = geceSay(firsat?.ucus_tarihi, firsat?.donus_tarihi)
            const otelBase = `https://search.hotellook.com/?destination=${encodeURIComponent(sehirAd)}&checkIn=${gidisTarih}&checkOut=${donusTarih}${yolcuParam}&marker=${mk}&locale=tr&currency=try`
            return (
              <div style={{ ...cs, padding: 20, marginBottom: 16 }}>
                {/* Uçuş fiyatı — kişi sayısına göre */}
                {(() => {
                  const kisiSayisi = (yolcu.yetiskin || 1) + (yolcu.cocuk || 0)
                  const toplamFiyat = (firsat?.fiyat || 0) * kisiSayisi
                  const tekKisi = kisiSayisi === 1
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ marginBottom: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 6px' }}>
                          <span style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent-orange)', letterSpacing: '-0.5px' }}>{toplamFiyat.toLocaleString('tr-TR')} ₺</span>
                          <span style={{ fontSize: 11, color: 'var(--accent-orange)', fontWeight: 500, whiteSpace: 'nowrap' }}>gidis-donus{tekKisi ? '' : ` (${kisiSayisi} kişi)`}</span>
                        </div>
                        {!tekKisi && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Kişi başı: {firsat?.fiyat?.toLocaleString('tr-TR')} ₺</div>}
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Normal: <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 16 }}>{((firsat?.normal_fiyat || 0) * kisiSayisi).toLocaleString('tr-TR')} ₺</span></div>
                        {yolcu.bebek > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>+ bebek ücreti ayrıca</div>}
                        {canliFiyatYukleniyor && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>✈ Anlık fiyat kontrol ediliyor...</div>}
                        {canliFiyat && <div style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 600, marginTop: 6 }}>Güncel fiyat: {canliFiyat.canli_fiyat.toLocaleString('tr-TR')} ₺ <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>({canliFiyat.guncelleme} itibarıyla)</span></div>}
                      </div>
                      <div style={{ background: 'linear-gradient(135deg, #FF5C1A, #FF8C42)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>%{firsat?.indirim_orani}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>ucuz</div>
                      </div>
                    </div>
                  )
                })()}

                {/* Otel — arama linkleri */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>🏨</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Otel{geceS ? ` · ${geceS} gece` : ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div onClick={() => openAffiliate(otelLinkler?.hotellook || otelBase)}
                      style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? 6 : 0, padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border-color)', cursor: 'pointer', overflow: 'hidden' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Hotellook</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>En ucuz otel fiyatlarını karşılaştır</div>
                      </div>
                      {isMobile ? (
                        <div style={{ background: 'rgba(0,200,150,0.15)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>Ara →</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>Ara →</span>
                      )}
                    </div>
                    <div onClick={() => openAffiliate(otelLinkler?.booking || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(sehirAd)}&checkin=${gidisTarih}&checkout=${donusTarih}&group_adults=${yolcu.yetiskin || 2}`)}
                      style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? 6 : 0, padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border-color)', cursor: 'pointer', overflow: 'hidden' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Booking.com</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Geniş otel seçenekleri ve yorumlar</div>
                      </div>
                      {isMobile ? (
                        <div style={{ background: 'rgba(255,92,26,0.15)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--accent-orange)', fontWeight: 600 }}>Ara →</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--accent-orange)', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>Ara →</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                    Otel fiyatları tarih ve doluluk oranına göre değişir. Güncel fiyatlar için yukarıdaki siteleri ziyaret edin.
                  </div>
                </div>

                {it?.toplam_aktivite_eur && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tahmini aktivite butcesi</span>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>~€{it.toplam_aktivite_eur}</span>
                  </div>
                )}
                {it?.en_iyi_zaman && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>📅 {it.en_iyi_zaman}</div>}
              </div>
            )
          })()}

          {/* Uçuş Detayları */}
          {(() => {
            const akt = aktarmaBilgi(firsat)
            const sure = sureBilgisi(firsat?.sure_dk)
            const bgj = bagajDetay(firsat?.havayolu)
            const havayoluAd = firsat?.havayolu ? (HAVAYOLU_ADLARI[firsat.havayolu] || firsat.havayolu) : null
            return (
              <div style={{ ...cs, padding: 20, marginBottom: 16 }}>
                <div style={{ ...lbl, marginBottom: 14 }}>✈️ Uçuş Detayları</div>

                {/* Gidiş Uçuşu */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-amber)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Gidiş Uçuşu</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {cikisSehir} ({o}) → {sehirAd} ({d})
                  </div>
                  {firsat?.ucus_tarihi && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Tarih: {tarihFormat(firsat.ucus_tarihi)}</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, color: akt.renk, fontWeight: 500 }}>{akt.ikon} {akt.yazi}</span>
                    {sure && <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>⏱️ {sure}</span>}
                    {havayoluAd && <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>🛫 {havayoluAd}</span>}
                  </div>
                </div>

                {/* Dönüş Uçuşu */}
                {firsat?.donus_tarihi && (
                  <div style={{ marginBottom: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: 12, color: 'var(--accent-amber)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Dönüş Uçuşu</div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                      {sehirAd} ({d}) → {cikisSehir} ({o})
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Tarih: {tarihFormat(firsat.donus_tarihi)}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                      <span style={{ fontSize: 14, color: akt.renk, fontWeight: 500 }}>{akt.ikon} {akt.yazi}</span>
                      {sure && <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>⏱️ {sure}</span>}
                    </div>
                  </div>
                )}

                {/* Bagaj & Fiyat Kapsamı */}
                <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-color)', marginBottom: 10 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>🧳 {bgj}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Bu fiyat 1 yetişkin, gidiş-dönüş bilet içindir.
                    Koltuk seçimi ve yemek ekstra ücretli olabilir.
                  </div>
                </div>

                {/* Uyarı kutusu */}
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-amber)', lineHeight: 1.6 }}>
                    Uçuş saatleri ve bagaj bilgileri bilet satın alma sırasında değişebilir. Kesin bilgi için Aviasales'te rezervasyon sırasında kontrol edin.
                  </div>
                </div>

                {/* Deep link */}
                <div style={{ marginTop: 10, textAlign: 'center' }}>
                  <span onClick={(e) => { e.stopPropagation(); openAffiliate(links.aviasales) }} style={{ fontSize: 13, color: 'var(--accent-orange)', fontWeight: 600, cursor: 'pointer' }}>Detaylı uçuş bilgisi → Aviasales</span>
                </div>
              </div>
            )
          })()}

          {/* Bilet Satın Al */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...lbl, marginBottom: 10 }}>✈️ Bilet Satın Al</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
              {platformlar.map((p, i) => isMobile ? (
                <div key={i} onClick={() => openAffiliate(p.link)} style={{ ...cs, padding: 14, cursor: 'pointer', borderLeft: `4px solid ${p.renk}`, overflow: 'hidden', maxWidth: '100%' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{p.emoji} {p.isim}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: p.renk, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.fiyatYazi}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{tarihBilgi}</div>
                  <div style={{ background: `${p.renk}20`, border: `1px solid ${p.renk}40`, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: p.renk }}>Sitede gör →</div>
                  </div>
                </div>
              ) : (
                <div key={i} onClick={() => openAffiliate(p.link)} style={{ ...cs, padding: '16px 18px', cursor: 'pointer', borderLeft: `4px solid ${p.renk}`, display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s', overflow: 'hidden', maxWidth: '100%' }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{p.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{p.isim}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: p.renk, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{p.fiyatYazi}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{tarihBilgi}</div>
                  </div>
                  <div style={{ background: `${p.renk}20`, border: `1px solid ${p.renk}40`, borderRadius: 10, padding: '8px 12px', flexShrink: 0, marginLeft: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: p.renk, whiteSpace: 'nowrap' }}>{p.buton} ↗</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EKTA Seyahat Sigortası — sadece yurtdışı */}
          {!YURTICI_KODLARI.has(firsat?.varis) && (
            <div style={{
              ...cs,
              padding: 20,
              marginBottom: 16,
              borderLeft: '3px solid var(--accent-green)',
            }}>
              <div style={{ ...lbl, marginBottom: 12 }}>🛡 Seyahat Sigortası</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                Schengen vize başvurularında seyahat sağlık sigortası zorunludur. Diğer ülkelere seyahatlerde zorunlu olmasa da, yurtdışında yaşayabileceğiniz sağlık sorunları, bagaj kaybı veya uçuş iptali gibi risklere karşı sizi ekonomik olarak güvende tutar.
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                EKTA Traveling • 4.9/5 ⭐ • 2.6M+ müşteri • COVID-19 kapsamı
              </div>
              <a
                href="https://ektatraveling.tpk.mx/5WRO1JgY"
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => trackAffiliateClick(null, null, null, { partner: 'ekta', placement: 'detay-yurtdisi' })}
                style={{
                  display: 'inline-block',
                  background: 'var(--accent-orange)',
                  color: '#fff',
                  padding: '10px 22px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Sigorta Al →
              </a>
            </div>
          )}

          {/* Seyahat Hazırlıkları — sadece yurtdışı */}
          {!YURTICI_KODLARI.has(firsat?.varis) && (() => {
            const hizmetSiralama = it?.hizmet_siralama || null

            const hizmetler = [
              { id:'esim', ikon:'📶', baslik:'Yurt dışı internet', aciklama:'Roaming yerine eSIM — varışta anında aktif', fiyat:'7 günlük paket ~150₺\'den', link:`https://tp.media/r?marker=${mk}&trs=267485&p=4114&u=https%3A%2F%2Fwww.airalo.com%2F&campaign_id=100` },
              { id:'arac', ikon:'🚗', baslik:'Araç kirala', aciklama:'Şehri özgürce gezmek için', fiyat:'Günlük ~800₺\'den', link:`https://tp.media/r?marker=${mk}&trs=267485&p=7584&u=https%3A%2F%2Fwww.discovercars.com%2F&campaign_id=100` },
              { id:'valiz', ikon:'🧳', baslik:'Valiz emanet', aciklama:'Otele erken varışta veya geç çıkışta', fiyat:'Saatlik ~30₺\'den', link:`https://tp.media/r?marker=${mk}&trs=267485&p=8236&u=https%3A%2F%2Fstasher.com%2F&campaign_id=100` },
              { id:'transfer', ikon:'🚖', baslik:'Havalimanı transferi', aciklama:'Varışta taksimetre sürprizi olmasın', fiyat:'Sabit fiyatlı transfer', link:`https://tp.media/r?marker=${mk}&trs=267485&p=2074&u=https%3A%2F%2Fkiwitaxi.com%2F&campaign_id=100` },
            ]

            // Uzak rota tespiti (6+ saat uçuş)
            const UZAK_KODLARI = new Set(['NRT','HND','ICN','BKK','HKT','DPS','SIN','KUL','JFK','LAX','MIA','ORD','GRU','EZE','SYD','MEL','AKL','NBO','CPT','MRU','SEZ','MLE','HKG','DEL','BOM','CMB','PEK','PVG','CUN','MEX','NYC','TYO','SEL'])
            const uzakMi = UZAK_KODLARI.has(firsat?.varis)

            // Hizmet sıralaması AI'dan geldiyse ona göre sırala
            let sirali = hizmetler
            if (hizmetSiralama?.length) {
              const siraMap = {}
              hizmetSiralama.forEach((id, i) => { siraMap[id] = i })
              sirali = [...hizmetler].sort((a, b) => {
                const ai = siraMap[a.id] ?? 99
                const bi = siraMap[b.id] ?? 99
                return ai - bi
              })
            } else {
              // Varsayılan akıllı sıralama — uzak rotalar için eSIM, araç önce
              const oncelik = []
              if (uzakMi) {
                oncelik.push('esim', 'arac', 'transfer', 'valiz')
              } else {
                oncelik.push('esim', 'transfer', 'arac', 'valiz')
              }
              const benzersiz = [...new Set(oncelik)]
              const siraMap = {}
              benzersiz.forEach((id, i) => { siraMap[id] = i })
              sirali = [...hizmetler].sort((a, b) => {
                const ai = siraMap[a.id] ?? 99
                const bi = siraMap[b.id] ?? 99
                return ai - bi
              })
            }

            const hizmetRenkleri = { esim: '#7C3AED', arac: '#FF5C1A', valiz: '#F43F5E', transfer: '#0066FF' }
            const hizmetPastel = { esim: 'rgba(124,58,237,0.15)', arac: 'rgba(255,92,26,0.15)', valiz: 'rgba(244,63,94,0.15)', transfer: 'rgba(0,102,255,0.15)' }

            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...lbl, marginBottom: 10 }}>🎒 Seyahat Hazırlıkları</div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
                  {sirali.map(h => (
                    <div key={h.id} onClick={(e) => { e.stopPropagation(); openAffiliate(h.link) }} style={{
                      ...cs, padding: '16px 18px', minWidth: 200, maxWidth: 220, cursor: 'pointer',
                      scrollSnapAlign: 'start', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8,
                      borderTop: `3px solid ${hizmetRenkleri[h.id] || 'var(--accent-orange)'}`, transition: 'border-color 0.15s',
                    }}>
                      <div style={{ background: hizmetPastel[h.id] || 'var(--bg-tertiary)', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{h.ikon}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{h.baslik}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{h.aciklama}</div>
                      <div style={{ fontSize: 11, color: hizmetRenkleri[h.id] || 'var(--accent-amber)', fontWeight: 500 }}>{h.fiyat}</div>
                      <div style={{ fontSize: 12, color: 'var(--accent-orange)', fontWeight: 600, marginTop: 4 }}>İncele →</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
                  Dedektif Gezgin bu hizmetleri sunmaz, ilgili platformlara yönlendirir.
                </div>
              </div>
            )
          })()}

          {/* Itinerary */}
          {yukleniyor && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>✈️ Program hazırlanıyor...</div>}
          {detayHata && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 15, color: 'var(--accent-orange)', fontWeight: 500, marginBottom: 8 }}>{detayHata}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Lütfen tekrar deneyin.</div>
              <button onClick={onGeri} style={{ background: 'var(--accent-orange)', border: 'none', borderRadius: 10, padding: '10px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Geri Dön</button>
            </div>
          )}
          {itUretiliyor && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 40, marginBottom: 16, animation: 'fadeIn 1s ease infinite alternate' }}>✨</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--accent-amber)', marginBottom: 8 }}>AI seyahat programınız hazırlanıyor...</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>Claude, {sehirAd} için kişiselleştirilmiş gün gün program oluşturuyor. Bu işlem 10-20 saniye sürebilir.</div>
            </div>
          )}
          {!itUretiliyor && it?.gunler?.map(gun => <GunKart key={gun.gun} gun={gun} />)}

          {/* Alternatif Tarihler */}
          {altTarihler.length > 0 && (
            <div style={{ ...cs, padding: 20, marginBottom: 16 }}>
              <div style={{ ...lbl, marginBottom: 14 }}>📅 Alternatif Tarihler</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {altTarihler.map((a, i) => {
                  const gece = geceSay(a.ucus_tarihi, a.donus_tarihi)
                  const altLinks = generateAllLinks(o, d, a.ucus_tarihi, a.donus_tarihi, yolcu)
                  const handleClick = () => {
                    if (a.id) {
                      onFirsat?.({ ...firsat, id: a.id, ucus_tarihi: a.ucus_tarihi, donus_tarihi: a.donus_tarihi, fiyat: a.fiyat, indirim_orani: a.indirim_orani })
                    } else {
                      openAffiliate(altLinks.aviasales)
                    }
                  }
                  return (
                    <div key={a.id || `alt-${i}`} onClick={handleClick} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 10, border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{tarihFormat(a.ucus_tarihi)} → {tarihFormat(a.donus_tarihi)}</div>
                        {gece > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{gece} gece</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-orange)' }}>{a.fiyat?.toLocaleString('tr-TR')} ₺</div>
                        {!a.id && <div style={{ fontSize: 10, color: 'var(--accent-green)', marginTop: 2 }}>Bilet ara ↗</div>}
                        {a.id && a.indirim_orani > 0 && <div style={{ fontSize: 11, color: 'var(--accent-amber)' }}>%{a.indirim_orani} ucuz</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Aktiviteler */}
          {aktiviteler.length > 0 && (<>
            <div style={{ ...lbl, marginTop: 8 }}>🎯 Aktiviteler & Turlar</div>
            {aktiviteler.map((a, i) => (
              <div key={i} style={{ ...cs, padding: 16, marginBottom: 10, overflow: 'hidden', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{a.emoji} {a.baslik}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.aciklama}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-orange)' }}>€{a.fiyat_eur}</div>
                    {a.puan > 0 && <div style={{ fontSize: 11, color: 'var(--accent-amber)', marginTop: 2 }}>⭐ {a.puan}</div>}
                  </div>
                </div>
                {a.sure && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>⏱️ {a.sure}</div>}
                {!YURTICI_KODLARI.has(firsat?.varis) && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={(e) => { e.stopPropagation(); openAffiliate(`https://www.getyourguide.com/s/?q=${encodeQuery(a.baslik + ' ' + sehirAd)}`) }} style={{ flex: 1, minWidth: 0, background: 'rgba(255,92,26,0.15)', border: '1px solid rgba(255,92,26,0.2)', borderRadius: 8, padding: '7px 10px', color: 'var(--accent-orange)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>GetYourGuide'da ara ↗</button>
                    <button onClick={(e) => { e.stopPropagation(); openAffiliate(`https://www.viator.com/searchResults/all?text=${encodeQuery(a.baslik + ' ' + sehirAd)}`) }} style={{ flex: 1, minWidth: 0, background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 8, padding: '7px 10px', color: 'var(--accent-green)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Viator'da ara ↗</button>
                  </div>
                )}
              </div>
            ))}
          </>)}

        </div>

        {/* === SAG KOLON === */}
        <div className="detay-col-sag">
          {/* YouTube Gezi Videoları */}
          <div style={{ marginBottom: 20 }}>
            <div style={lbl}>🎬 Gezi Videoları</div>

            {kanalVideo ? (<>
              {/* Ucuza Gezen Doktor videosu */}
              <div
                onClick={() => window.open(`https://www.youtube.com/watch?v=${kanalVideo.id}`, '_blank')}
                style={{ ...cs, overflow: 'hidden', borderRadius: 12, cursor: 'pointer', marginBottom: 10 }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={`https://img.youtube.com/vi/${kanalVideo.id}/mqdefault.jpg`} alt={kanalVideo.baslik} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(204,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 0, height: 0, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: '18px solid #fff', marginLeft: 3 }} />
                    </div>
                  </div>
                  {/* Kanal badge */}
                  <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(204,0,0,0.9)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 600, color: '#fff', letterSpacing: '0.02em' }}>Ucuza Gezen Doktor</div>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{kanalVideo.baslik}</span>
                  <span style={{ fontSize: 11, color: '#CC0000', fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>İzle ↗</span>
                </div>
              </div>
              {/* Genel arama linki */}
              <div
                onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(sehirAd + ' gezi videoları')}`, '_blank')}
                style={{ ...cs, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderLeft: '3px solid #CC0000' }}
              >
                <span style={{ fontSize: 18 }}>🎬</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{sehirAd} gezi videoları</span>
                <span style={{ fontSize: 11, color: '#CC0000', fontWeight: 600, flexShrink: 0 }}>YouTube'da ara ↗</span>
              </div>
            </>) : (<>
              {/* Kanal videosu yok — arama kartları */}
              <div
                onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(sehirAd + ' gezi rehberi vlog')}`, '_blank')}
                style={{ ...cs, overflow: 'hidden', borderRadius: 12, cursor: 'pointer', marginBottom: 10 }}
              >
                <div style={{ padding: '28px 20px', background: 'linear-gradient(135deg, #1e293b 0%, #4a1520 40%, #CC0000 100%)', textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <div style={{ width: 0, height: 0, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: '18px solid #fff', marginLeft: 3 }} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{sehirAd} Gezi Videoları</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>YouTube'da ara ↗</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { etiket: `${sehirAd} gezilecek yerler`, emoji: '📍' },
                  { etiket: `${sehirAd} yeme içme`, emoji: '🍽️' },
                  { etiket: `${sehirAd} pratik bilgiler`, emoji: '💡' },
                ].map((item, i) => (
                  <div
                    key={i}
                    onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(item.etiket)}`, '_blank')}
                    style={{ ...cs, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderLeft: '3px solid #CC0000' }}
                  >
                    <span style={{ fontSize: 18 }}>{item.emoji}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{item.etiket}</span>
                    <span style={{ fontSize: 11, color: '#CC0000', fontWeight: 600, flexShrink: 0 }}>Ara ↗</span>
                  </div>
                ))}
              </div>
            </>)}
          </div>

          {/* Benzer fırsatlar */}
          {benzer.length > 0 && (
            <div>
              <div style={lbl}>🔥 Benzer Fiyatlı {['AYT','DLM','ADB','ESB','TZX','GZT','ADA','BJV','NAV','VAN','ERZ','SZF','DIY','IST','SAW','IZM','ANK','COV','GZP','TRS'].includes(d) ? 'Yurtiçi' : 'Yurtdışı'} Fırsatlar</div>
              {benzer.map(b => (
                <div key={b.id} onClick={() => onFirsat?.(b)} style={{ ...cs, padding: 14, marginBottom: 10, cursor: 'pointer', borderLeft: '3px solid var(--accent-orange)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{ulkeEkle(b.varis_sehir || b.varis, b.varis)} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>({b.varis})</span></div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tarihFormat(b.ucus_tarihi)}{b.donus_tarihi ? ` → ${tarihFormat(b.donus_tarihi)}` : ''}{geceSay(b.ucus_tarihi, b.donus_tarihi) ? ` · ${geceSay(b.ucus_tarihi, b.donus_tarihi)} gece` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-orange)' }}>{b.fiyat?.toLocaleString('tr-TR')} ₺</div>
                      <div style={{ fontSize: 11, color: 'var(--accent-amber)', fontWeight: 600 }}>%{b.indirim_orani} ucuz</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bar — tam genislik, kolonlarin disinda */}
      <div className="detay-sticky-bar" style={isMobile ? { padding: '6px 16px 8px' } : undefined}>
        <div style={{ padding: isMobile ? '3px 16px' : '4px 12px 0', textAlign: 'center', overflow: 'hidden' }}>
          <p style={{ fontSize: isMobile ? 9 : 12, color: isMobile ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)', fontStyle: 'italic', whiteSpace: isMobile ? 'nowrap' : undefined, overflow: isMobile ? 'hidden' : undefined, textOverflow: isMobile ? 'ellipsis' : undefined, margin: 0, lineHeight: isMobile ? undefined : 1.4 }}>Uçuş fiyatı Aviasales üzerinden alınmıştır. Otel fiyatları için Hotellook'u ziyaret edin. Fiyatlar değişkenlik gösterebilir. Dedektif Gezgin aracı platformdur, bilet veya otel satışı yapmaz.</p>
        </div>
        <div className="detay-sticky-inner" style={{ padding: isMobile ? '10px 0' : '8px 16px 12px', gap: isMobile ? 8 : undefined }}>
          <button style={{ flex: 1, padding: isMobile ? 10 : 12, background: 'var(--accent-orange)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,92,26,0.4)' }} onClick={() => openAffiliate(links.aviasales)}>✈️ Bilet ara</button>
          <button style={{ flex: 1, padding: isMobile ? 10 : 12, background: 'var(--accent-green)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,200,150,0.4)' }} onClick={() => openAffiliate(hotellookLink)}>🏨Otel bul</button>
        </div>
      </div>

      {/* Fullscreen photo */}
      {buyukFoto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }} onClick={() => setBuyukFoto(null)}>
          <button onClick={() => setBuyukFoto(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 20, padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: 14, zIndex: 201 }}>✕ Kapat</button>
          <img src={buyukFoto.url_buyuk || buyukFoto.url_orta} alt="" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          {buyukFoto.fotograf && <div style={{ position: 'absolute', bottom: 20, textAlign: 'center', width: '100%', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>📷 {buyukFoto.fotograf}</div>}
        </div>
      )}
    </div>
  )
}
