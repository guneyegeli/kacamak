import { useState, useEffect } from 'react'
import { api } from '../services/api'

// IATA → Şehir adı mapping
const SEHIR_ADLARI = {
  // Türkiye
  IST: 'İstanbul', SAW: 'İstanbul', ADB: 'İzmir', AYT: 'Antalya', ESB: 'Ankara',
  ADA: 'Adana', DLM: 'Dalaman', BJV: 'Bodrum', NAV: 'Nevşehir', GZP: 'Trabzon',
  TZX: 'Trabzon', GZT: 'Gaziantep', VAN: 'Van', ERZ: 'Erzurum', TRS: 'Trabzon',
  SZF: 'Samsun', IZM: 'İzmir', ANK: 'Ankara', COV: 'Konya', DIY: 'Diyarbakır',
  YEI: 'Bursa',
  // Rusya
  MOW: 'Moskova', SVO: 'Moskova', VKO: 'Moskova', DME: 'Moskova',
  LED: 'St. Petersburg', KRR: 'Krasnodar', AER: 'Soçi', MRV: 'Mineralnye Vody',
  MCX: 'Mahaçkale', KZN: 'Kazan', RMO: 'Rostov', ROV: 'Rostov', VOZ: 'Voronej',
  SVX: 'Yekaterinburg', GRV: 'Grozny', OGZ: 'Vladikavkaz',
  CEK: 'Çelyabinsk', UFA: 'Ufa', PEE: 'Perm', GOJ: 'Nijniy Novgorod',
  OMS: 'Omsk', KJA: 'Krasnoyarsk', TJM: 'Tümen', KGD: 'Kaliningrad',
  RTW: 'Saratov', OVB: 'Novosibirsk', KUF: 'Samara',
  // Avrupa
  PAR: 'Paris', CDG: 'Paris', ORY: 'Paris',
  BCN: 'Barselona', MAD: 'Madrid', TCI: 'Tenerife',
  ROM: 'Roma', FCO: 'Roma', CIA: 'Roma', MXP: 'Milano', BGY: 'Milano',
  LHR: 'Londra', LON: 'Londra', LGW: 'Londra', STN: 'Londra', LTN: 'Londra',
  BER: 'Berlin', TXL: 'Berlin', FRA: 'Frankfurt', MUC: 'Münih',
  DUS: 'Düsseldorf', HAM: 'Hamburg', STR: 'Stuttgart', CGN: 'Köln',
  NUE: 'Nürnberg', HAJ: 'Hannover', BRE: 'Bremen', LEJ: 'Leipzig', DTM: 'Dortmund',
  ATH: 'Atina', BUD: 'Budapeşte', PRG: 'Prag', VIE: 'Viyana',
  AMS: 'Amsterdam', LIS: 'Lizbon', DUB: 'Dublin', CPH: 'Kopenhag',
  OSL: 'Oslo', ARN: 'Stockholm', HEL: 'Helsinki', ZRH: 'Zürih', BRU: 'Brüksel',
  WAW: 'Varşova', BEG: 'Belgrad', TGD: 'Podgorica', TIV: 'Tivat',
  OTP: 'Bükreş', SOF: 'Sofya', SKP: 'Üsküp', TIA: 'Tiran',
  ZAG: 'Zagreb', SJJ: 'Saraybosna', SKD: 'Samarkand',
  // Kafkasya / Orta Doğu
  TBS: 'Tiflis', GYD: 'Bakü', BAK: 'Bakü', GNJ: 'Gence', EVN: 'Erivan',
  JED: 'Cidde', MED: 'Medine', RUH: 'Riyad', DXB: 'Dubai', DOH: 'Doha',
  MCT: 'Muskat', BAH: 'Bahreyn', KWI: 'Kuveyt', AMM: 'Amman',
  TLV: 'Tel Aviv', BEY: 'Beyrut',
  // Kuzey Afrika
  CAI: 'Kahire', SSH: 'Şarm El Şeyh', HRG: 'Hurghada',
  CMN: 'Kazablanka', RAK: 'Marakeş', TUN: 'Tunus',
  // Kıbrıs
  ECN: 'Lefkoşa', LCA: 'Larnaka', PFO: 'Paphos',
  // Orta Asya
  TAS: 'Taşkent', BSZ: 'Bişkek', NQZ: 'Nursultan', ALA: 'Almatı',
  MSQ: 'Minsk', CIT: 'Şymkent', OSS: 'Oş',
  // Uzak Doğu
  BKK: 'Bangkok', HKT: 'Phuket', KUL: 'Kuala Lumpur', SIN: 'Singapur',
  MNL: 'Manila', DPS: 'Bali', HND: 'Tokyo', NRT: 'Tokyo', ICN: 'Seul',
  PEK: 'Pekin', PVG: 'Şangay', HKG: 'Hong Kong',
  DEL: 'Delhi', BOM: 'Mumbai', CMB: 'Kolombo',
  // Amerika
  JFK: 'New York', LAX: 'Los Angeles', MIA: 'Miami',
  SFO: 'San Francisco', ORD: 'Chicago', ATL: 'Atlanta',
  YYZ: 'Toronto', MEX: 'Meksiko', CUN: 'Cancun',
  GRU: 'Sao Paulo', GIG: 'Rio de Janeiro', EZE: 'Buenos Aires',
  // Okyanusya
  SYD: 'Sidney', MEL: 'Melbourne', AKL: 'Auckland',
  MLE: 'Maldivler',
  // Ek kodlar
  RZV: 'Rize-Artvin', VAS: 'Sivas', BTS: 'Bratislava', PRN: 'Priştine',
  NAP: 'Napoli', MRS: 'Marsilya', RTM: 'Rotterdam', POZ: 'Poznan',
  ABZ: 'Aberdeen', BUH: 'Bükreş', TYO: 'Tokyo', CJU: 'Jeju',
  IKT: 'İrkutsk', FEG: 'Fergana', SHJ: 'Sharjah',
}

// IATA → Türkçe ülke adı (yurtdışı destinasyonlar için)
const ULKE_ADLARI = {
  // İspanya
  BCN: 'İspanya', MAD: 'İspanya', TCI: 'İspanya',
  // Fransa
  PAR: 'Fransa', CDG: 'Fransa', ORY: 'Fransa',
  // İngiltere
  LHR: 'İngiltere', LON: 'İngiltere', LGW: 'İngiltere', STN: 'İngiltere', LTN: 'İngiltere',
  // Almanya
  BER: 'Almanya', TXL: 'Almanya', MUC: 'Almanya', FRA: 'Almanya',
  DUS: 'Almanya', HAM: 'Almanya', STR: 'Almanya', CGN: 'Almanya',
  NUE: 'Almanya', HAJ: 'Almanya', BRE: 'Almanya', LEJ: 'Almanya', DTM: 'Almanya',
  // İtalya
  ROM: 'İtalya', FCO: 'İtalya', CIA: 'İtalya', MXP: 'İtalya', BGY: 'İtalya',
  // Diğer Avrupa
  AMS: 'Hollanda', PRG: 'Çekya', BUD: 'Macaristan', VIE: 'Avusturya',
  ATH: 'Yunanistan', LIS: 'Portekiz', WAW: 'Polonya', ZAG: 'Hırvatistan',
  BEG: 'Sırbistan', SOF: 'Bulgaristan', OTP: 'Romanya', SKP: 'Kuzey Makedonya',
  TIA: 'Arnavutluk', SJJ: 'Bosna Hersek', DUB: 'İrlanda', CPH: 'Danimarka',
  OSL: 'Norveç', ARN: 'İsveç', HEL: 'Finlandiya', ZRH: 'İsviçre', BRU: 'Belçika',
  TGD: 'Karadağ', TIV: 'Karadağ',
  // Kafkasya / Orta Doğu
  TBS: 'Gürcistan', GYD: 'Azerbaycan', BAK: 'Azerbaycan', GNJ: 'Azerbaycan',
  EVN: 'Ermenistan', TLV: 'İsrail', AMM: 'Ürdün', BEY: 'Lübnan',
  DXB: 'BAE', DOH: 'Katar',
  JED: 'Suudi Arabistan', MED: 'Suudi Arabistan', RUH: 'Suudi Arabistan',
  MCT: 'Umman', BAH: 'Bahreyn', KWI: 'Kuveyt',
  // Afrika
  CAI: 'Mısır', SSH: 'Mısır', HRG: 'Mısır', CMN: 'Fas', RAK: 'Fas', TUN: 'Tunus',
  // Kıbrıs
  ECN: 'KKTC', LCA: 'Kıbrıs', PFO: 'Kıbrıs',
  // Rusya
  MOW: 'Rusya', SVO: 'Rusya', VKO: 'Rusya', DME: 'Rusya',
  LED: 'Rusya', AER: 'Rusya', KRR: 'Rusya', RMO: 'Rusya', ROV: 'Rusya', VOZ: 'Rusya',
  KZN: 'Rusya', SVX: 'Rusya', MRV: 'Rusya', MCX: 'Rusya', GRV: 'Rusya',
  OGZ: 'Rusya', CEK: 'Rusya', UFA: 'Rusya', PEE: 'Rusya', GOJ: 'Rusya',
  OMS: 'Rusya', KJA: 'Rusya', TJM: 'Rusya', KGD: 'Rusya', RTW: 'Rusya',
  OVB: 'Rusya', KUF: 'Rusya',
  // Orta Asya
  TAS: 'Özbekistan', SKD: 'Özbekistan', BSZ: 'Kırgızistan', OSS: 'Kırgızistan',
  NQZ: 'Kazakistan', ALA: 'Kazakistan', CIT: 'Kazakistan', MSQ: 'Belarus',
  // Uzak Doğu
  BKK: 'Tayland', HKT: 'Tayland', SIN: 'Singapur', KUL: 'Malezya',
  MNL: 'Filipinler', DPS: 'Endonezya',
  HND: 'Japonya', NRT: 'Japonya', ICN: 'Güney Kore',
  PEK: 'Çin', PVG: 'Çin', HKG: 'Hong Kong',
  DEL: 'Hindistan', BOM: 'Hindistan', CMB: 'Sri Lanka',
  // Amerika
  JFK: 'ABD', MIA: 'ABD', LAX: 'ABD', SFO: 'ABD', ORD: 'ABD', ATL: 'ABD',
  YYZ: 'Kanada', MEX: 'Meksika', CUN: 'Meksika',
  GRU: 'Brezilya', GIG: 'Brezilya', EZE: 'Arjantin',
  // Okyanusya / Afrika
  SYD: 'Avustralya', MEL: 'Avustralya', AKL: 'Yeni Zelanda',
  CPT: 'Güney Afrika', NBO: 'Kenya', MRU: 'Mauritius', SEZ: 'Seyşeller',
  MLE: 'Maldivler',
  // Ek kodlar
  BTS: 'Slovakya', PRN: 'Kosova', NAP: 'İtalya', MRS: 'Fransa',
  RTM: 'Hollanda', POZ: 'Polonya', ABZ: 'İngiltere', BUH: 'Romanya',
  TYO: 'Japonya', CJU: 'Güney Kore', IKT: 'Rusya', FEG: 'Özbekistan',
  SHJ: 'BAE',
}

// Yurtiçi havaalanı kodları
const YURTICI_KODLARI = new Set([
  'AYT', 'DLM', 'ADB', 'ESB', 'TZX', 'GZT', 'ADA', 'BJV', 'NAV', 'VAN',
  'ERZ', 'TRS', 'SZF', 'DIY', 'IST', 'SAW', 'IZM', 'ANK', 'COV', 'GZP',
  'KYA', 'MLX', 'EZS', 'ASR', 'NOP', 'ONQ', 'HTY', 'GNY', 'MQM', 'IGD',
  'MSR', 'KSY', 'EDO', 'CKZ', 'TEQ', 'USQ', 'DNZ', 'ISE', 'AFY', 'BZI',
  'YEI', 'RZV', 'VAS',
])

const sehirAdi = (f) => {
  const ad = f.varis_sehir || SEHIR_ADLARI[f.varis] || f.varis
  if (!YURTICI_KODLARI.has(f.varis)) {
    const ulke = ULKE_ADLARI[f.varis]
    if (ulke) return `${ad}, ${ulke}`
  }
  return ad
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

// Küçük havalimanları — uluslararası direkt uçuş yok
const KUCUK_HAVAALANLARI = new Set([
  'EDO','ISE','NOP','DNZ','SZF','MSR','MLX','EZS','IGD','KSY','MQM','GNY',
  'ONQ','CKZ','TEQ','USQ','AFY','BZI','KYA','ASR','HTY','NOP','VAN','ERZ',
])
// Büyük hub'lar — direkt uçuş olabilir
const BUYUK_HUBLAR = new Set(['IST','SAW','ADB','AYT','ESB','ADA','GZT','TZX','BJV','DLM'])

// Bölge bazlı tahmini uçuş süresi (dakika)
const YAKIN_AVRUPA = new Set(['ATH','SOF','BEG','SKP','TIA','OTP','BUD','ZAG','SJJ','TBS','GYD','BAK','ECN','LCA','PFO','TGD','TIV','EVN'])
const ORTA_AVRUPA = new Set(['FCO','ROM','CIA','MXP','BGY','BER','TXL','VIE','PRG','MUC','WAW','ZRH','BRU','FRA','DUS','HAM','STR','CGN','NUE','HAJ','BRE','LEJ','DTM','CPH','AMS'])
const UZAK_AVRUPA = new Set(['LHR','LON','LGW','STN','LTN','BCN','MAD','LIS','DUB','OSL','ARN','HEL','TCI','ORY'])
const ORTA_DOGU = new Set(['DXB','DOH','JED','MED','RUH','MCT','BAH','KWI','AMM','TLV','BEY','CAI','SSH','HRG','CMN','RAK','TUN'])

const tahminSure = (varis) => {
  if (YURTICI_KODLARI.has(varis)) return { dk: 90, yazi: '~1-2s' }
  if (YAKIN_AVRUPA.has(varis)) return { dk: 150, yazi: '~2-3s' }
  if (ORTA_AVRUPA.has(varis)) return { dk: 210, yazi: '~3-4s' }
  if (UZAK_AVRUPA.has(varis)) return { dk: 270, yazi: '~4-5s' }
  if (ORTA_DOGU.has(varis)) return { dk: 180, yazi: '~2-4s' }
  return { dk: 660, yazi: '~8-15s' } // Uzak
}

const aktarmaBilgi = (f) => {
  if (f.aktarma > 0) return { ikon: '🔄', yazi: f.aktarma === 1 ? '1 aktarma' : `${f.aktarma} aktarma`, renk: '#F7C948' }
  if (f.aktarma === 0 && f.sure_dk > 0) return { ikon: '✈️', yazi: 'Direkt uçuş', renk: 'rgba(46,196,182,0.9)' }
  return { ikon: '✈️', yazi: 'Sitede kontrol edin', renk: 'rgba(255,255,255,0.45)' }
}

const sureBilgisi = (dk) => {
  if (!dk || dk <= 0) return null
  // API gidiş-dönüş toplam süre veriyor, tek yön için /2
  const tekYon = Math.round(dk / 2)
  const s = Math.floor(tekYon / 60)
  const m = tekYon % 60
  return `${s}s${m > 0 ? ` ${m}dk` : ''}`
}

const bagajBilgi = (havayolu) => {
  if (!havayolu) return { yazi: 'Bagaj bilgisi için bilet sitesini kontrol edin', kisa: 'Sitede kontrol edin' }
  if (havayolu === 'TK') return { yazi: 'Genellikle 1 adet 23kg bagaj dahil', kisa: '23kg bagaj dahil' }
  if (havayolu === 'PC') return { yazi: 'Genellikle el bagajı dahil, hold bagajı ekstra', kisa: 'El bagajı dahil' }
  if (havayolu === 'XQ') return { yazi: 'Genellikle el bagajı dahil, hold bagajı ekstra', kisa: 'El bagajı dahil' }
  if (BAGAJ_23KG.has(havayolu)) return { yazi: 'Genellikle 23kg bagaj dahil', kisa: '23kg bagaj dahil' }
  if (BAGAJ_KABIN.has(havayolu)) return { yazi: 'Genellikle el bagajı dahil, hold bagajı ekstra', kisa: 'El bagajı dahil' }
  return { yazi: 'Bagaj bilgisi için bilet sitesini kontrol edin', kisa: 'Sitede kontrol edin' }
}

const cikisBadgeRenk = (kod) => {
  if (kod === 'IST' || kod === 'SAW') return null // İstanbul: badge yok
  if (kod === 'ESB') return '#FF6B35' // Ankara: turuncu
  if (kod === 'ADB') return '#2EC4B6' // İzmir: turkuaz
  return '#F7C948' // Diğerleri: altın
}

function FirsatKart({ f, fotolar, altTarihler, onFirsat }) {
  const foto = fotolar[f.varis]
  const renk = kenarRengi(f.indirim_orani)
  const gece = geceSay(f.ucus_tarihi, f.donus_tarihi)
  const sehir = sehirAdi(f)
  const varisAd = f.varis_sehir || SEHIR_ADLARI[f.varis] || f.varis
  const cikisAd = f.cikis_sehir || cikisSehirAdi(f.cikis)
  const yeni = f.yeni === 1 || (f.olusturulma && (Date.now() - new Date(f.olusturulma).getTime()) < 86400000)
  const badgeRenk = cikisBadgeRenk(f.cikis)
  const akt = aktarmaBilgi(f)
  const sure = sureBilgisi(f.sure_dk)
  const bgj = bagajBilgi(f.havayolu)

  return (
    <div onClick={() => onFirsat(f)} style={{borderRadius:'var(--radius)',border:'1px solid var(--border)',borderLeft:`3px solid ${renk}`,marginBottom:14,cursor:'pointer',overflow:'hidden',background:'var(--bg2)',backdropFilter:'blur(12px)'}}>
      <div style={{position:'relative',height:150,overflow:'hidden',background:foto?undefined:kartGradient(f.varis)}}>
        {foto && <img src={foto.url_kucuk} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />}
        <div style={{position:'absolute',inset:0,background:foto?'linear-gradient(transparent 15%, rgba(27,31,59,0.97))':'linear-gradient(transparent 5%, rgba(27,31,59,0.92))'}} />
        <div style={{position:'absolute',bottom:10,left:14,right:14}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontSize:15,fontWeight:600,color:'#fff'}}>{cikisAd}</span>
            <span style={{fontSize:15,color:'#FF6B35',fontWeight:700}}>✈</span>
            <span style={{fontSize:15,fontWeight:600,color:'#fff'}}>{sehir}</span>
            {badgeRenk && <span style={{background:badgeRenk,borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:700,color:'#1B1F3B',letterSpacing:'0.04em'}}>{f.cikis}</span>}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',fontWeight:500}}>
            {cikisAd} ({f.cikis}) → {sehir} ({f.varis})
            {f.ucus_tarihi ? ` · ${tarihFormat(f.ucus_tarihi)}` : ''}
            {f.donus_tarihi ? ` → ${tarihFormat(f.donus_tarihi)}` : ''}
            {gece ? ` (${gece} gece)` : ''}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:4,display:'flex',flexWrap:'wrap',gap:6,alignItems:'center'}}>
            <span style={{color:akt.renk}}>{akt.ikon} {akt.yazi}</span>
            {sure && <><span style={{color:'rgba(255,255,255,0.25)'}}>·</span><span>⏱️ {sure}</span></>}
            <><span style={{color:'rgba(255,255,255,0.25)'}}>·</span><span>🧳 {bgj.kisa}</span></>
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
        {f.diger_cikislar?.length > 0 && (
          <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--border)',fontSize:13,color:'rgba(255,255,255,0.7)'}}>
            <span style={{color:'var(--accent2)',fontWeight:600}}>Diğer kalkışlar: </span>
            {f.diger_cikislar.map((d, i) => (
              <span key={d.cikis}>{i > 0 && ' · '}<span style={{color:'var(--text2)',fontWeight:500}}>{d.cikis_sehir} {d.fiyat?.toLocaleString('tr-TR')}₺</span></span>
            ))}
          </div>
        )}
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
  const [hata, setHata] = useState(null)
  const [fotolar, setFotolar] = useState({})
  const [altTarihler, setAltTarihler] = useState({})

  useEffect(() => {
    // Önce tercihleri çek, sonra fırsatları tercih edilen çıkışlarla filtrele
    api.tercihGetir().then(t => {
      const cikislar = t?.tercihler?.cikis_havalimanlari
      const cikisParam = cikislar?.length ? cikislar.join(',') : ''
      const direkt = t?.tercihler?.direkt_ucus
      return api.firsatlar(cikisParam, direkt)
    }).catch(() => api.firsatlar()).then(data => {
      if (!Array.isArray(data)) { setFirsatlar([]); return }
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
    }).catch(() => { setFirsatlar([]); setHata('Fırsatlar yüklenirken bir sorun oluştu.') }).finally(() => setYukleniyor(false))
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
        {!yukleniyor && hata && (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
            <h3 style={{marginBottom:8,fontWeight:500,color:'var(--accent)'}}>{hata}</h3>
            <p style={{color:'var(--text2)',fontSize:14,lineHeight:1.6,marginBottom:16}}>Lütfen internet bağlantınızı kontrol edip tekrar deneyin.</p>
            <button onClick={() => { setHata(null); setYukleniyor(true); window.location.reload() }} style={{background:'var(--accent)',border:'none',borderRadius:10,padding:'10px 24px',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>Yenile</button>
          </div>
        )}
        {!yukleniyor && !hata && firsatlar.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:48,marginBottom:16}}>🔍</div>
            <h3 style={{marginBottom:8,fontWeight:500}}>Henüz fırsat yok</h3>
            <p style={{color:'var(--text2)',fontSize:14,lineHeight:1.6}}>Sistem her 30 dakikada fiyatları tarıyor.</p>
          </div>
        )}

        {!yukleniyor && !hata && firsatlar.length > 0 && (
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
