import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { openAffiliate } from '../utils/affiliateLinks'
import YURTICI_KODLARI from '../utils/yurticiKodlari'

const MARKER = import.meta.env.VITE_TRAVELPAYOUTS_MARKER || '518734'

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
  // API farklı kodla dönen şehirler
  NYC: 'New York', SEL: 'Seul', BJS: 'Pekin', SHA: 'Şangay',
  RIO: 'Rio de Janeiro', SAO: 'Sao Paulo', BUE: 'Buenos Aires',
  MIL: 'Milano', CHI: 'Chicago',
  // Eksik Türkiye
  OGU: 'Ordu', ERC: 'Erzincan', TJK: 'Tokat', UGC: 'Uşak', BUS: 'Batum',
  // Eksik yurtdışı
  CPT: 'Cape Town', NBO: 'Nairobi', MRU: 'Mauritius', SEZ: 'Seyşeller',
  GVA: 'Cenevre', JTR: 'Santorini', BOG: 'Bogota', LIM: 'Lima',
  SCL: 'Santiago', CAN: 'Guangzhou', NAJ: 'Nahçıvan',
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
  // API farklı kodla dönen şehirler
  NYC: 'ABD', SEL: 'Güney Kore', BJS: 'Çin', SHA: 'Çin',
  RIO: 'Brezilya', SAO: 'Brezilya', BUE: 'Arjantin',
  MIL: 'İtalya', CHI: 'ABD',
  // Eksik
  GVA: 'İsviçre', JTR: 'Yunanistan', BOG: 'Kolombiya',
  LIM: 'Peru', SCL: 'Şili', CAN: 'Çin', BUS: 'Gürcistan',
}

// Yurtiçi havaalanı kodları

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
  if (oran >= 50) return '#FF5C1A'
  if (oran >= 30) return '#F59E0B'
  return '#00C896'
}

const kartGradient = (kod) => {
  const hash = (kod || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const aclar = [135, 160, 200, 225, 315]
  const aci = aclar[hash % aclar.length]
  const renkler = [
    ['#0D1B2A', '#1B2B4B', '#FF5C1A'],
    ['#0D1B2A', '#142233', '#00C896'],
    ['#0D1B2A', '#1E1B3A', '#F59E0B'],
    ['#0D1B2A', '#0F2A20', '#00C896'],
    ['#0D1B2A', '#2A1B0F', '#FF5C1A'],
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
  if (f.aktarma > 0) return { ikon: '🔄', yazi: f.aktarma === 1 ? '1 aktarma' : `${f.aktarma} aktarma`, renk: '#F59E0B' }
  if (f.aktarma === 0 && f.sure_dk > 0) return { ikon: '✈️', yazi: 'Direkt uçuş', renk: '#00C896' }
  return { ikon: '✈️', yazi: 'Sitede kontrol edin', renk: 'var(--text3)' }
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
  if (kod === 'ESB') return '#FF5C1A' // Ankara: turuncu
  if (kod === 'ADB') return '#00C896' // İzmir: turkuaz
  return '#F59E0B' // Diğerleri: altın
}

function FirsatKart({ f, fotolar, altTarihler, onFirsat, yolcu }) {
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
    <div onClick={() => onFirsat(f)} style={{borderRadius:'var(--radius)',border:'1px solid rgba(255,255,255,0.08)',borderLeft:`3px solid ${renk}`,marginBottom:14,cursor:'pointer',overflow:'hidden',background:'linear-gradient(145deg, #0D1B2A, #1B2B4B)',boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>
      <div style={{position:'relative',height:150,overflow:'hidden',background:foto?undefined:kartGradient(f.varis)}}>
        {foto && <img src={foto.url_kucuk} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />}
        <div style={{position:'absolute',inset:0,background:foto?'linear-gradient(rgba(0,0,0,0.0) 15%, rgba(13,27,42,0.95))':'linear-gradient(rgba(0,0,0,0.0) 5%, rgba(13,27,42,0.9))'}} />
        <div style={{position:'absolute',bottom:10,left:14,right:14}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontSize:15,fontWeight:600,color:'#fff'}}>{cikisAd}</span>
            <span style={{fontSize:15,color:'#FF5C1A',fontWeight:700}}>✈</span>
            <span style={{fontSize:15,fontWeight:600,color:'#fff'}}>{sehir}</span>
            {badgeRenk && <span style={{background:badgeRenk,borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:700,color:'#fff',letterSpacing:'0.04em'}}>{f.cikis}</span>}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.75)',fontWeight:500}}>
            {cikisAd} ({f.cikis}) → {sehir} ({f.varis})
            {f.ucus_tarihi ? ` · ${tarihFormat(f.ucus_tarihi)}` : ''}
            {f.donus_tarihi ? ` → ${tarihFormat(f.donus_tarihi)}` : ''}
            {gece ? ` (${gece} gece)` : ''}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:4,display:'flex',flexWrap:'wrap',gap:5,alignItems:'center',fontWeight:500}}>
            <span style={{color:akt.renk}}><span style={{fontSize:15,lineHeight:1}}>{akt.ikon}</span> {akt.yazi}</span>
            {sure && <><span style={{color:'rgba(255,255,255,0.35)'}}>·</span><span><span style={{fontSize:15,lineHeight:1}}>⏱️</span> {sure}</span></>}
            <><span style={{color:'rgba(255,255,255,0.35)'}}>·</span><span><span style={{fontSize:15,lineHeight:1}}>🧳</span> {bgj.kisa}</span></>
          </div>
        </div>
        {yeni && (
          <div className="yeni-badge" style={{position:'absolute',top:10,left:10,background:'#00C896',borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:700,color:'#fff',letterSpacing:'0.05em',boxShadow:'0 0 12px rgba(0,200,150,0.6)'}}>
            YEN&#304;
          </div>
        )}
        <div style={{position:'absolute',top:10,right:10,background:'#FF5C1A',borderRadius:8,padding:'6px 10px',textAlign:'center'}}>
          <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>%{f.indirim_orani}</div>
        </div>
      </div>
      <div style={{padding:'12px 16px'}}>
        {(() => {
          const kisiSayisi = (yolcu?.yetiskin || 1) + (yolcu?.cocuk || 0)
          const toplamFiyat = (f.fiyat || 0) * kisiSayisi
          const tekKisi = kisiSayisi === 1
          return (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <span style={{fontSize:24,fontWeight:700,color:'#FF5C1A'}}>{toplamFiyat.toLocaleString('tr-TR')} ₺</span>
                <span style={{fontSize:11,color:'#FF5C1A',fontWeight:500,marginLeft:4}}>gidiş-dönüş{tekKisi ? '' : ` (${kisiSayisi} kişi)`}</span>
                {!tekKisi && <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2}}>Kişi başı: {f.fiyat?.toLocaleString('tr-TR')} ₺</div>}
                {yolcu?.bebek > 0 && <div style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>+ bebek ücreti ayrıca</div>}
              </div>
              <div style={{fontSize:12,color:'#00C896',fontWeight:500}}>Detay →</div>
            </div>
          )
        })()}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:6,paddingTop:6,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.6)',fontWeight:500}}><span style={{fontSize:15,lineHeight:1}}>🏨</span> Otel{gece ? ` · ${gece} gece` : ''}</span>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.35)',fontWeight:500}}>Detayda görün</span>
        </div>
        {f.diger_cikislar?.length > 0 && (
          <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.08)',fontSize:13,color:'rgba(255,255,255,0.5)'}}>
            <span style={{color:'#00C896',fontWeight:600}}>Diğer kalkışlar: </span>
            {f.diger_cikislar.map((d, i) => (
              <span key={d.cikis}>{i > 0 && ' · '}<span style={{color:'rgba(255,255,255,0.5)',fontWeight:500}}>{d.cikis_sehir} {d.fiyat?.toLocaleString('tr-TR')}₺</span></span>
            ))}
          </div>
        )}
        {altTarihler[f.id]?.length > 0 && (
          <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.08)',fontSize:11,color:'rgba(255,255,255,0.35)'}}>
            <span style={{color:'#00C896',fontWeight:500}}>Diğer tarihler: </span>
            {altTarihler[f.id].map((a, i) => (
              <span key={a.id}>{i > 0 && ' · '}<span style={{color:'rgba(255,255,255,0.5)'}}>{tarihFormat(a.ucus_tarihi)} {a.fiyat?.toLocaleString('tr-TR')}₺</span></span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Havalimanları listesi (filtre paneli için)
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

const BOLGELER = [
  {kod:'avrupa',isim:'Avrupa'},{kod:'asya',isim:'Asya'},
  {kod:'ortadogu',isim:'Orta Dogu'},{kod:'afrika',isim:'Afrika'},
  {kod:'amerika',isim:'Amerika'},
]

const GECE_ARALIKLARI_YURTICI = [
  {kod:'1-3',isim:'1-3 gece'},{kod:'3-7',isim:'3-7 gece'},{kod:'7-10',isim:'7-10 gece'},
]

const GECE_ARALIKLARI_YURTDISI = [
  {kod:'3-5',isim:'3-5 gece'},{kod:'5-7',isim:'5-7 gece'},{kod:'7-10',isim:'7-10 gece'},
  {kod:'7-14',isim:'7-14 gece'},{kod:'14-21',isim:'14-21 gece'},{kod:'21+',isim:'21+ gece'},
]

const BOS_FILTRE_YURTICI = { kalkis:[], varis:[], geceler:[], min_fiyat:'', max_fiyat:'' }
const BOS_FILTRE_YURTDISI = { kalkis:[], bolge:[], sehir:'', geceler:[], min_fiyat:'', max_fiyat:'' }

function filtreYukle(key, bos) {
  try {
    const s = localStorage.getItem(`kacamak_filtre_${key}`)
    if (s) { const p = JSON.parse(s); return {...bos, ...p} }
  } catch {}
  return {...bos}
}

function filtreKaydet(key, filtre) {
  localStorage.setItem(`kacamak_filtre_${key}`, JSON.stringify(filtre))
}

function aktifFiltreSay(filtre) {
  let n = 0
  if (filtre.kalkis?.length) n++
  if (filtre.varis?.length) n++
  if (filtre.bolge?.length) n++
  if (filtre.sehir) n++
  if (filtre.geceler?.length) n++
  if (filtre.min_fiyat || filtre.max_fiyat) n++
  return n
}

// Filtre paneli ortak stiller
const filtreGrupBaslik = {fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600,marginBottom:10,paddingTop:16}
const filtreAyirici = {height:1,background:'var(--border)',margin:'0 -20px'}
const filtreInput = {flex:1,padding:'10px 14px',borderRadius:10,border:'1px solid var(--border-light)',background:'var(--bg-secondary)',color:'var(--text-primary)',fontSize:14,minHeight:44,boxSizing:'border-box'}

// Chip bileşeni (filtre paneli için)
function FiltreChip({label, aktif, onClick}) {
  return (
    <button onClick={onClick} style={{
      padding:'8px 14px',borderRadius:20,fontSize:13,cursor:'pointer',fontWeight:500,
      border: aktif ? '1px solid var(--accent)' : '1px solid var(--border-light)',
      background: aktif ? 'rgba(255,92,26,0.1)' : 'var(--bg-secondary)',
      color: aktif ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
      minHeight:44,transition:'all 0.15s',
    }}>{label}</button>
  )
}

// Filtre paneli overlay + bottom sheet
function FiltrePanel({ acik, onKapat, baslik, renk, children }) {
  if (!acik) return null
  return (
    <>
      <div onClick={onKapat} style={{
        position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,
      }} />
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:201,
        background:'var(--bg-tertiary)',borderRadius:'20px 20px 0 0',
        maxHeight:'85vh',overflowY:'auto',
        boxShadow:'0 -4px 30px rgba(0,0,0,0.5)',
        animation:'slideUp 0.25s ease-out',
      }}>
        <div style={{padding:'16px 20px 0',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'var(--bg-tertiary)',zIndex:1,borderBottom:'1px solid var(--border-color)',paddingBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:4,height:18,borderRadius:2,background:renk}} />
            <h3 style={{fontSize:16,fontWeight:600,color:'var(--text)'}}>{baslik}</h3>
          </div>
          <button onClick={onKapat} style={{background:'none',border:'none',fontSize:22,color:'var(--text-secondary)',cursor:'pointer',padding:8,minWidth:44,minHeight:44,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{padding:'16px 20px 32px'}}>
          {children}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  )
}

const SIRALAMA_SECENEKLERI = [
  {kod:'varsayilan', isim:'Varsayılan'},
  {kod:'fiyat_artan', isim:'Fiyat: Düşük→Yüksek'},
  {kod:'fiyat_azalan', isim:'Fiyat: Yüksek→Düşük'},
  {kod:'yeni', isim:'Yeni eklenenler'},
  {kod:'yakin_tarih', isim:'Yakın tarihli'},
  {kod:'uzak_tarih', isim:'Uzak tarihli'},
  {kod:'indirim', isim:'İndirim oranı'},
]

function SiralamaDropdown({ acik, secili, onSec, onKapat, renk }) {
  if (!acik) return null
  const aktifIsim = SIRALAMA_SECENEKLERI.find(s => s.kod === secili)?.isim || 'Varsayılan'
  return (
    <>
      <div onClick={onKapat} style={{position:'fixed',inset:0,zIndex:199}} />
      <div style={{
        position:'absolute',top:'100%',right:0,marginTop:6,zIndex:200,
        background:'var(--bg-secondary)',border:'1px solid var(--border-light)',borderRadius:10,
        boxShadow:'var(--shadow-dropdown)',minWidth:220,overflow:'hidden',
      }}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border-color)',fontSize:12,color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>
          ↕ Sıralama
        </div>
        {SIRALAMA_SECENEKLERI.map(s => (
          <div key={s.kod} onClick={() => { onSec(s.kod); onKapat() }}
            style={{padding:'12px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,
              fontSize:13,color: s.kod === secili ? renk : 'rgba(255,255,255,0.85)',fontWeight: s.kod === secili ? 600 : 400,
              background: s.kod === secili ? 'var(--bg-hover)' : 'transparent',minHeight:44,
            }}>
            <span style={{width:16,textAlign:'center',fontSize:13}}>{s.kod === secili ? '✓' : ''}</span>
            {s.isim}
          </div>
        ))}
      </div>
    </>
  )
}

function yolcuYukle() {
  try {
    const s = localStorage.getItem('kacamak_yolcu')
    if (s) return JSON.parse(s)
  } catch {}
  return { yetiskin: 1, cocuk: 0, bebek: 0 }
}

function yolcuKaydet(y) {
  localStorage.setItem('kacamak_yolcu', JSON.stringify(y))
}

function yolcuLabel(y) {
  const toplam = y.yetiskin + y.cocuk + y.bebek
  if (y.cocuk > 0 || y.bebek > 0) {
    let s = `${y.yetiskin}Y`
    if (y.cocuk > 0) s += ` + ${y.cocuk}Ç`
    if (y.bebek > 0) s += ` + ${y.bebek}B`
    return s
  }
  if (toplam === 1) return '1 Yetişkin'
  return `${toplam} Kişi`
}

function YolcuDropdown({ acik, yolcu, onDegistir, onKapat }) {
  if (!acik) return null
  const toplam = yolcu.yetiskin + yolcu.cocuk + yolcu.bebek
  const Sayac = ({ label, alt, value, onArt, onAzalt, min = 0 }) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0'}}>
      <div>
        <div style={{fontSize:14,color:'rgba(255,255,255,0.85)',fontWeight:500}}>{label}</div>
        {alt && <div style={{fontSize:11,color:'var(--text-muted)'}}>{alt}</div>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <button onClick={onAzalt} disabled={value <= min} style={{width:32,height:32,borderRadius:'50%',border:'1px solid var(--border-light)',background: value <= min ? 'transparent' : 'rgba(255,255,255,0.08)',color: value <= min ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',fontSize:16,cursor: value <= min ? 'default' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
        <span style={{fontSize:16,fontWeight:600,color:'var(--text-primary)',minWidth:20,textAlign:'center'}}>{value}</span>
        <button onClick={onArt} disabled={toplam >= 9} style={{width:32,height:32,borderRadius:'50%',border:'1px solid var(--border-light)',background: toplam >= 9 ? 'transparent' : 'rgba(255,255,255,0.08)',color: toplam >= 9 ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',fontSize:16,cursor: toplam >= 9 ? 'default' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
      </div>
    </div>
  )
  return (
    <>
      <div onClick={onKapat} style={{position:'fixed',inset:0,zIndex:199}} />
      <div style={{
        position:'absolute',top:'100%',left:0,marginTop:6,zIndex:200,
        background:'var(--bg-secondary)',border:'1px solid var(--border-light)',borderRadius:10,
        boxShadow:'var(--shadow-dropdown)',minWidth:240,overflow:'hidden',
      }}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border-color)',fontSize:12,color:'var(--text-muted)',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>
          👥 Yolcu Sayısı
        </div>
        <div style={{padding:'4px 16px'}}>
          <Sayac label="Yetişkin" value={yolcu.yetiskin} min={1}
            onArt={() => { if (yolcu.yetiskin < 6 && toplam < 9) onDegistir({...yolcu, yetiskin: yolcu.yetiskin + 1}) }}
            onAzalt={() => { if (yolcu.yetiskin > 1) { const y = {...yolcu, yetiskin: yolcu.yetiskin - 1}; if (y.bebek > y.yetiskin) y.bebek = y.yetiskin; onDegistir(y) }}} />
          <Sayac label="Çocuk" alt="2-11 yaş" value={yolcu.cocuk} min={0}
            onArt={() => { if (yolcu.cocuk < 4 && toplam < 9) onDegistir({...yolcu, cocuk: yolcu.cocuk + 1}) }}
            onAzalt={() => { if (yolcu.cocuk > 0) onDegistir({...yolcu, cocuk: yolcu.cocuk - 1}) }} />
          <Sayac label="Bebek" alt="0-2 yaş" value={yolcu.bebek} min={0}
            onArt={() => { if (yolcu.bebek < 2 && yolcu.bebek < yolcu.yetiskin && toplam < 9) onDegistir({...yolcu, bebek: yolcu.bebek + 1}) }}
            onAzalt={() => { if (yolcu.bebek > 0) onDegistir({...yolcu, bebek: yolcu.bebek - 1}) }} />
        </div>
        <div style={{padding:'10px 16px',borderTop:'1px solid var(--border-color)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:13,color:'var(--text-muted)'}}>Toplam: {toplam} yolcu</span>
          <button onClick={onKapat} style={{background:'var(--accent)',border:'none',borderRadius:8,padding:'8px 20px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',minHeight:36}}>Uygula</button>
        </div>
      </div>
    </>
  )
}

function toggleListe(liste, deger) {
  return liste.includes(deger) ? liste.filter(x => x !== deger) : [...liste, deger]
}

export default function AnaSayfa({ onFirsat, onTercih }) {
  const [firsatlar, setFirsatlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState(null)
  const [fotolar, setFotolar] = useState({})
  const [altTarihler, setAltTarihler] = useState({})
  const [tercihler, setTercihler] = useState(null)

  // Filtre state
  const [yurticiFiltre, setYurticiFiltre] = useState(() => filtreYukle('yurtici', BOS_FILTRE_YURTICI))
  const [yurtdisiFiltre, setYurtdisiFiltre] = useState(() => filtreYukle('yurtdisi', BOS_FILTRE_YURTDISI))
  const [yurticiPanelAcik, setYurticiPanelAcik] = useState(false)
  const [yurtdisiPanelAcik, setYurtdisiPanelAcik] = useState(false)
  // Geçici filtre (panel açıkken düzenlenen, Uygula'ya basınca aktif olur)
  const [geciciYurtici, setGeciciYurtici] = useState({...BOS_FILTRE_YURTICI})
  const [geciciYurtdisi, setGeciciYurtdisi] = useState({...BOS_FILTRE_YURTDISI})
  // Sıralama state (oturum bazlı, localStorage yok)
  const [yiSiralama, setYiSiralama] = useState('varsayilan')
  const [ydSiralama, setYdSiralama] = useState('varsayilan')
  const [yiSiralamaAcik, setYiSiralamaAcik] = useState(false)
  const [ydSiralamaAcik, setYdSiralamaAcik] = useState(false)
  // Yolcu state (her iki bölüm ortak, localStorage'da saklanır)
  const [yolcu, setYolcu] = useState(yolcuYukle)
  const [yolcuAcik, setYolcuAcik] = useState(false)
  const [aktifTab, setAktifTab] = useState('yurtdisi')
  const yolcuDegistir = (y) => { setYolcu(y); yolcuKaydet(y) }

  const firsatCek = (tercihData, yiFiltre, ydFiltre, yiSort, ydSort) => {
    setYukleniyor(true)
    setHata(null)

    const cikislar = tercihData?.cikis_havalimanlari
    const esnek = tercihData?.esnek_tarih
    const temelParams = {
      cikis: cikislar?.length ? cikislar.join(',') : '',
      direkt: tercihData?.direkt_ucus,
      gidis_tarihi: !esnek ? (tercihData?.gidis_tarihi || '') : '',
      donus_tarihi: !esnek ? (tercihData?.donus_tarihi || '') : '',
    }

    // Yurtiçi ve yurtdışı ayrı çekilir, filtreler ayrı uygulanır
    const yiParams = {...temelParams, tip: 'yurtici', siralama: yiSort || 'varsayilan'}
    if (yiFiltre.kalkis?.length) yiParams.cikis = yiFiltre.kalkis.join(',')
    if (yiFiltre.varis?.length) yiParams.varis = yiFiltre.varis.join(',')
    if (yiFiltre.geceler?.length) yiParams.geceler = yiFiltre.geceler.join(',')
    if (yiFiltre.min_fiyat) yiParams.min_fiyat = yiFiltre.min_fiyat
    if (yiFiltre.max_fiyat) yiParams.max_fiyat = yiFiltre.max_fiyat

    const ydParams = {...temelParams, tip: 'yurtdisi', siralama: ydSort || 'varsayilan'}
    if (ydFiltre.kalkis?.length) ydParams.cikis = ydFiltre.kalkis.join(',')
    if (ydFiltre.bolge?.length) ydParams.varis_bolge = ydFiltre.bolge.join(',')
    if (ydFiltre.sehir) ydParams.varis_sehir = ydFiltre.sehir
    if (ydFiltre.geceler?.length) ydParams.geceler = ydFiltre.geceler.join(',')
    if (ydFiltre.min_fiyat) ydParams.min_fiyat = ydFiltre.min_fiyat
    if (ydFiltre.max_fiyat) ydParams.max_fiyat = ydFiltre.max_fiyat

    Promise.all([
      api.firsatlar(yiParams),
      api.firsatlar(ydParams),
    ]).then(([yiData, ydData]) => {
      const yi = Array.isArray(yiData) ? yiData : []
      const yd = Array.isArray(ydData) ? ydData : []
      const birlesik = [...yi, ...yd]
      setFirsatlar(birlesik)
      birlesik.forEach(f => {
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
    }).catch(() => {
      setFirsatlar([])
      setHata('Fırsatlar yüklenirken bir sorun oluştu.')
    }).finally(() => setYukleniyor(false))
  }

  useEffect(() => {
    const yiF = filtreYukle('yurtici', BOS_FILTRE_YURTICI)
    const ydF = filtreYukle('yurtdisi', BOS_FILTRE_YURTDISI)
    api.tercihGetir().then(t => {
      const td = t?.tercihler || null
      setTercihler(td)
      firsatCek(td, yiF, ydF, yiSiralama, ydSiralama)
    }).catch(() => firsatCek(null, yiF, ydF, yiSiralama, ydSiralama))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const yurticiUygula = () => {
    setYurticiFiltre(geciciYurtici)
    filtreKaydet('yurtici', geciciYurtici)
    setYurticiPanelAcik(false)
    firsatCek(tercihler, geciciYurtici, yurtdisiFiltre, yiSiralama, ydSiralama)
  }
  const yurticiTemizle = () => {
    const bos = {...BOS_FILTRE_YURTICI}
    setGeciciYurtici(bos)
    setYurticiFiltre(bos)
    filtreKaydet('yurtici', bos)
    setYurticiPanelAcik(false)
    firsatCek(tercihler, bos, yurtdisiFiltre, yiSiralama, ydSiralama)
  }
  const yurtdisiUygula = () => {
    setYurtdisiFiltre(geciciYurtdisi)
    filtreKaydet('yurtdisi', geciciYurtdisi)
    setYurtdisiPanelAcik(false)
    firsatCek(tercihler, yurticiFiltre, geciciYurtdisi, yiSiralama, ydSiralama)
  }
  const yurtdisiTemizle = () => {
    const bos = {...BOS_FILTRE_YURTDISI}
    setGeciciYurtdisi(bos)
    setYurtdisiFiltre(bos)
    filtreKaydet('yurtdisi', bos)
    setYurtdisiPanelAcik(false)
    firsatCek(tercihler, yurticiFiltre, bos, yiSiralama, ydSiralama)
  }

  const yurtici = firsatlar.filter(f => YURTICI_KODLARI.has(f.varis))
  const yurtdisi = firsatlar.filter(f => !YURTICI_KODLARI.has(f.varis))
  const yiAktif = aktifFiltreSay(yurticiFiltre)
  const ydAktif = aktifFiltreSay(yurtdisiFiltre)

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      {/* Header */}
      <div className="page-constrained" style={{padding:'56px 20px 24px',background:'none',borderBottom:'none',boxShadow:'none'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',background:'none'}}>
          <img src="/logo.png" alt="Dedektif Gezgin" style={{height:160,background:'transparent',border:'none',boxShadow:'none',padding:0}} />
          <div style={{textAlign:'center',marginTop:16}}>
            <button onClick={onTercih} style={{background:'var(--bg-secondary)',border:'1px solid var(--border-light)',borderRadius:12,padding:'10px 16px',color:'var(--text-primary)',fontSize:13,fontWeight:500,cursor:'pointer'}}>Dedektif Gezgin Tercihleri</button>
            <p style={{fontSize:11,color:'var(--text-muted)',marginTop:6,lineHeight:1.4}}>Dedektif Gezgin'in yakalayacağı fırsatları buradan özelleştirebilirsiniz</p>
          </div>
        </div>
      </div>

      {/* Tab Butonları */}
      <div style={{display:'flex',gap:8,padding:'12px 20px',background:'rgba(0,0,0,0.2)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <button onClick={() => setAktifTab('yurtici')} style={{
          flex:1,padding:'12px 0',borderRadius:12,border:'none',cursor:'pointer',
          fontSize:14,fontWeight:700,letterSpacing:'0.03em',transition:'all 0.2s',
          background: aktifTab === 'yurtici' ? 'linear-gradient(135deg, #FF5C1A, #FF8C42)' : 'rgba(255,255,255,0.06)',
          color: aktifTab === 'yurtici' ? '#fff' : 'rgba(255,255,255,0.45)',
          boxShadow: aktifTab === 'yurtici' ? '0 4px 15px rgba(255,92,26,0.4)' : 'none',
        }}>✈️ Yurtiçi</button>
        <button onClick={() => setAktifTab('yurtdisi')} style={{
          flex:1,padding:'12px 0',borderRadius:12,border:'none',cursor:'pointer',
          fontSize:14,fontWeight:700,letterSpacing:'0.03em',transition:'all 0.2s',
          background: aktifTab === 'yurtdisi' ? 'linear-gradient(135deg, #00C896, #00A070)' : 'rgba(255,255,255,0.06)',
          color: aktifTab === 'yurtdisi' ? '#fff' : 'rgba(255,255,255,0.45)',
          boxShadow: aktifTab === 'yurtdisi' ? '0 4px 15px rgba(0,200,150,0.4)' : 'none',
        }}>🌍 Yurtdışı</button>
      </div>

      {/* Disclaimer */}
      <div style={{margin:'12px 20px 0',padding:'10px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',textAlign:'center'}}>
        <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.5,margin:0}}>
          ⚠️ Dedektif Gezgin bilet, otel ve tur satışı yapmaz. Sadece uygun fırsatları gösterir ve ilgili servis sağlayıcılara yönlendirir. Tüm rezervasyonlar ilgili platform üzerinden gerçekleştirilir.
        </p>
      </div>

      {/* İçerik */}
      <div style={{padding:'20px 20px 40px',maxWidth:1100,margin:'0 auto'}}>
        {yukleniyor && (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--text-secondary)'}}>
            <div style={{fontSize:32,marginBottom:12}}>✈</div>
            <p>Fırsatlar aranıyor...</p>
          </div>
        )}
        {!yukleniyor && hata && (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
            <h3 style={{marginBottom:8,fontWeight:500,color:'var(--accent)'}}>{hata}</h3>
            <p style={{color:'var(--text-secondary)',fontSize:14,lineHeight:1.6,marginBottom:16}}>Lütfen internet bağlantınızı kontrol edip tekrar deneyin.</p>
            <button onClick={() => { setHata(null); setYukleniyor(true); window.location.reload() }} style={{background:'var(--accent)',border:'none',borderRadius:10,padding:'10px 24px',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>Yenile</button>
          </div>
        )}
        {!yukleniyor && !hata && firsatlar.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:48,marginBottom:16}}>🔍</div>
            <h3 style={{marginBottom:8,fontWeight:500,color:'var(--text-primary)'}}>Henüz fırsat yok</h3>
            <p style={{color:'var(--text-secondary)',fontSize:14,lineHeight:1.6}}>Sistem her 30 dakikada fiyatları tarıyor.</p>
          </div>
        )}

        {!yukleniyor && !hata && firsatlar.length > 0 && (
          <div className="firsatlar-grid">
            {/* Yurtiçi Kolon */}
            {aktifTab === 'yurtici' && <div className="firsatlar-kolon">
              <div className="firsat-baslik-satiri">
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:4,height:20,borderRadius:2,background:'var(--accent-orange)'}} />
                  <h2 style={{fontSize:14,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-primary)'}}>Yurtiçi Fırsatlar</h2>
                </div>
                <div className="firsat-kontroller">
                  <div style={{position:'relative',flex:1}}>
                    <button onClick={() => { setYolcuAcik(p => !p); setYiSiralamaAcik(false); setYdSiralamaAcik(false) }} style={{
                      display:'flex',alignItems:'center',gap:5,background:'var(--bg-secondary)',
                      border:'1px solid var(--border-light)',borderRadius:10,padding:'6px 12px',cursor:'pointer',
                      color:'rgba(255,255,255,0.85)',fontSize:12,fontWeight:500,minHeight:44,width:'100%',justifyContent:'center',whiteSpace:'nowrap',
                    }}>
                      <span style={{fontSize:14}}>👤</span>
                      <span>{yolcuLabel(yolcu)}</span>
                      <span style={{fontSize:10}}>&#9660;</span>
                    </button>
                    <YolcuDropdown acik={yolcuAcik} yolcu={yolcu} onDegistir={yolcuDegistir} onKapat={() => setYolcuAcik(false)} />
                  </div>
                  <div style={{position:'relative',flex:1}}>
                    <button onClick={() => { setYiSiralamaAcik(p => !p); setYdSiralamaAcik(false); setYolcuAcik(false) }} style={{
                      display:'flex',alignItems:'center',gap:5,background:'var(--bg-secondary)',
                      border: yiSiralama !== 'varsayilan' ? '1px solid var(--accent-orange)' : '1px solid var(--border-light)',borderRadius:10,padding:'6px 12px',cursor:'pointer',
                      color: yiSiralama !== 'varsayilan' ? 'var(--accent-orange)' : 'rgba(255,255,255,0.85)',fontSize:12,fontWeight:500,minHeight:44,width:'100%',justifyContent:'center',
                    }}>
                      <span>↕</span>
                      <span>{yiSiralama !== 'varsayilan' ? (SIRALAMA_SECENEKLERI.find(s=>s.kod===yiSiralama)?.isim||'Sırala') : 'Sırala'}</span>
                      <span style={{fontSize:10}}>&#9660;</span>
                    </button>
                    <SiralamaDropdown acik={yiSiralamaAcik} secili={yiSiralama} renk="var(--accent)"
                      onKapat={() => setYiSiralamaAcik(false)}
                      onSec={(s) => { setYiSiralama(s); firsatCek(tercihler, yurticiFiltre, yurtdisiFiltre, s, ydSiralama) }} />
                  </div>
                  <button onClick={() => { setGeciciYurtici({...yurticiFiltre}); setYurticiPanelAcik(true) }} style={{
                    display:'flex',alignItems:'center',gap:6,background:'var(--bg-secondary)',border:'1px solid var(--border-light)',
                    borderRadius:10,padding:'6px 12px',cursor:'pointer',color:'rgba(255,255,255,0.85)',fontSize:12,fontWeight:500,minHeight:44,flex:1,justifyContent:'center',
                  }}>
                    <span style={{fontSize:14}}>&#9660;</span>
                    <span>Filtrele</span>
                    {yiAktif > 0 && <span style={{background:'var(--accent)',color:'#fff',borderRadius:10,padding:'2px 7px',fontSize:10,fontWeight:700}}>{yiAktif}</span>}
                  </button>
                </div>
              </div>
              {yurtici.length === 0 && (
                <p style={{color:'var(--text-muted)',fontSize:13,padding:'20px 0'}}>Yurtiçi fırsat bulunamadı.</p>
              )}
              {yurtici.map(f => (
                <FirsatKart key={f.id} f={f} fotolar={fotolar} altTarihler={altTarihler} onFirsat={onFirsat} yolcu={yolcu} />
              ))}
            </div>}

            {/* Yurtdışı Kolon */}
            {aktifTab === 'yurtdisi' && <div className="firsatlar-kolon">
              <div className="firsat-baslik-satiri">
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:4,height:20,borderRadius:2,background:'var(--accent-orange)'}} />
                  <h2 style={{fontSize:14,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-primary)'}}>Yurtdışı Fırsatlar</h2>
                </div>
                <div className="firsat-kontroller">
                  <div style={{position:'relative',flex:1}}>
                    <button onClick={() => { setYolcuAcik(p => !p); setYiSiralamaAcik(false); setYdSiralamaAcik(false) }} style={{
                      display:'flex',alignItems:'center',gap:5,background:'var(--bg-secondary)',
                      border:'1px solid var(--border-light)',borderRadius:10,padding:'6px 12px',cursor:'pointer',
                      color:'rgba(255,255,255,0.85)',fontSize:12,fontWeight:500,minHeight:44,width:'100%',justifyContent:'center',whiteSpace:'nowrap',
                    }}>
                      <span style={{fontSize:14}}>👤</span>
                      <span>{yolcuLabel(yolcu)}</span>
                      <span style={{fontSize:10}}>&#9660;</span>
                    </button>
                    <YolcuDropdown acik={yolcuAcik} yolcu={yolcu} onDegistir={yolcuDegistir} onKapat={() => setYolcuAcik(false)} />
                  </div>
                  <div style={{position:'relative',flex:1}}>
                    <button onClick={() => { setYdSiralamaAcik(p => !p); setYiSiralamaAcik(false); setYolcuAcik(false) }} style={{
                      display:'flex',alignItems:'center',gap:5,background:'var(--bg-secondary)',
                      border: ydSiralama !== 'varsayilan' ? '1px solid var(--accent-orange)' : '1px solid var(--border-light)',borderRadius:10,padding:'6px 12px',cursor:'pointer',
                      color: ydSiralama !== 'varsayilan' ? 'var(--accent-orange)' : 'rgba(255,255,255,0.85)',fontSize:12,fontWeight:500,minHeight:44,width:'100%',justifyContent:'center',
                    }}>
                      <span>↕</span>
                      <span>{ydSiralama !== 'varsayilan' ? (SIRALAMA_SECENEKLERI.find(s=>s.kod===ydSiralama)?.isim||'Sırala') : 'Sırala'}</span>
                      <span style={{fontSize:10}}>&#9660;</span>
                    </button>
                    <SiralamaDropdown acik={ydSiralamaAcik} secili={ydSiralama} renk="var(--success)"
                      onKapat={() => setYdSiralamaAcik(false)}
                      onSec={(s) => { setYdSiralama(s); firsatCek(tercihler, yurticiFiltre, yurtdisiFiltre, yiSiralama, s) }} />
                  </div>
                  <button onClick={() => { setGeciciYurtdisi({...yurtdisiFiltre}); setYurtdisiPanelAcik(true) }} style={{
                    display:'flex',alignItems:'center',gap:6,background:'var(--bg-secondary)',border:'1px solid var(--border-light)',
                    borderRadius:10,padding:'6px 12px',cursor:'pointer',color:'rgba(255,255,255,0.85)',fontSize:12,fontWeight:500,minHeight:44,flex:1,justifyContent:'center',
                  }}>
                    <span style={{fontSize:14}}>&#9660;</span>
                    <span>Filtrele</span>
                    {ydAktif > 0 && <span style={{background:'var(--success)',color:'#fff',borderRadius:10,padding:'2px 7px',fontSize:10,fontWeight:700}}>{ydAktif}</span>}
                  </button>
                </div>
              </div>
              {yurtdisi.length === 0 && (
                <p style={{color:'var(--text-muted)',fontSize:13,padding:'20px 0'}}>Yurtdışı fırsat bulunamadı.</p>
              )}
              {yurtdisi.map(f => (
                <FirsatKart key={f.id} f={f} fotolar={fotolar} altTarihler={altTarihler} onFirsat={onFirsat} yolcu={yolcu} />
              ))}
            </div>}
          </div>
        )}
      </div>

      {/* Yurtiçi Filtre Paneli */}
      <FiltrePanel acik={yurticiPanelAcik} onKapat={() => setYurticiPanelAcik(false)} baslik="Yurtiçi Filtre" renk="var(--accent)">
        {/* Kalkış */}
        <div style={{paddingBottom:16}}>
          <div style={filtreGrupBaslik}>✈ KALKIS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {HAVAALANLARI.map(h => (
              <FiltreChip key={h.kod} label={h.isim} aktif={geciciYurtici.kalkis.includes(h.kod)}
                onClick={() => setGeciciYurtici(p => ({...p, kalkis: toggleListe(p.kalkis, h.kod)}))} />
            ))}
          </div>
        </div>
        <div style={filtreAyirici} />
        {/* Varış */}
        <div style={{paddingBottom:16}}>
          <div style={filtreGrupBaslik}>🏁 VARIS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {HAVAALANLARI.map(h => (
              <FiltreChip key={h.kod} label={h.isim} aktif={geciciYurtici.varis.includes(h.kod)}
                onClick={() => setGeciciYurtici(p => ({...p, varis: toggleListe(p.varis, h.kod)}))} />
            ))}
          </div>
        </div>
        <div style={filtreAyirici} />
        {/* Süre */}
        <div style={{paddingBottom:16}}>
          <div style={filtreGrupBaslik}>📅 SURE</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {GECE_ARALIKLARI_YURTICI.map(g => (
              <FiltreChip key={g.kod} label={g.isim} aktif={geciciYurtici.geceler.includes(g.kod)}
                onClick={() => setGeciciYurtici(p => ({...p, geceler: toggleListe(p.geceler, g.kod)}))} />
            ))}
          </div>
        </div>
        <div style={filtreAyirici} />
        {/* Fiyat */}
        <div style={{paddingBottom:20}}>
          <div style={filtreGrupBaslik}>💰 FIYAT</div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <input type="number" placeholder="Min ₺" value={geciciYurtici.min_fiyat} onChange={e => setGeciciYurtici(p => ({...p, min_fiyat: e.target.value}))}
              style={filtreInput} />
            <span style={{color:'var(--text-muted)',fontSize:13}}>—</span>
            <input type="number" placeholder="Max ₺" value={geciciYurtici.max_fiyat} onChange={e => setGeciciYurtici(p => ({...p, max_fiyat: e.target.value}))}
              style={filtreInput} />
          </div>
        </div>
        <div style={filtreAyirici} />
        {/* Butonlar */}
        <div style={{display:'flex',gap:12,paddingTop:16}}>
          <button onClick={yurticiTemizle} style={{flex:1,padding:'14px',borderRadius:12,border:'1px solid var(--border)',background:'var(--bg-secondary)',color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:600,cursor:'pointer',minHeight:48}}>Temizle</button>
          <button onClick={yurticiUygula} style={{flex:2,padding:'14px',borderRadius:12,border:'none',background:'var(--accent)',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',minHeight:48}}>Uygula</button>
        </div>
      </FiltrePanel>

      {/* Yurtdışı Filtre Paneli */}
      <FiltrePanel acik={yurtdisiPanelAcik} onKapat={() => setYurtdisiPanelAcik(false)} baslik="Yurtdışı Filtre" renk="var(--success)">
        {/* Kalkış */}
        <div style={{paddingBottom:16}}>
          <div style={filtreGrupBaslik}>✈ KALKIS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {HAVAALANLARI.map(h => (
              <FiltreChip key={h.kod} label={h.isim} aktif={geciciYurtdisi.kalkis.includes(h.kod)}
                onClick={() => setGeciciYurtdisi(p => ({...p, kalkis: toggleListe(p.kalkis, h.kod)}))} />
            ))}
          </div>
        </div>
        <div style={filtreAyirici} />
        {/* Bölge */}
        <div style={{paddingBottom:16}}>
          <div style={filtreGrupBaslik}>🌍 BOLGE</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {BOLGELER.map(b => (
              <FiltreChip key={b.kod} label={b.isim} aktif={geciciYurtdisi.bolge.includes(b.kod)}
                onClick={() => setGeciciYurtdisi(p => ({...p, bolge: toggleListe(p.bolge, b.kod)}))} />
            ))}
          </div>
        </div>
        <div style={filtreAyirici} />
        {/* Şehir Ara */}
        <div style={{paddingBottom:16}}>
          <div style={filtreGrupBaslik}>🔍 SEHIR ARA</div>
          <input type="text" placeholder="Sehir ara... (ör. Paris, Londra)" value={geciciYurtdisi.sehir}
            onChange={e => setGeciciYurtdisi(p => ({...p, sehir: e.target.value}))}
            style={{...filtreInput,width:'100%'}} />
        </div>
        <div style={filtreAyirici} />
        {/* Süre */}
        <div style={{paddingBottom:16}}>
          <div style={filtreGrupBaslik}>📅 SURE</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {GECE_ARALIKLARI_YURTDISI.map(g => (
              <FiltreChip key={g.kod} label={g.isim} aktif={geciciYurtdisi.geceler.includes(g.kod)}
                onClick={() => setGeciciYurtdisi(p => ({...p, geceler: toggleListe(p.geceler, g.kod)}))} />
            ))}
          </div>
        </div>
        <div style={filtreAyirici} />
        {/* Fiyat */}
        <div style={{paddingBottom:20}}>
          <div style={filtreGrupBaslik}>💰 FIYAT</div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <input type="number" placeholder="Min ₺" value={geciciYurtdisi.min_fiyat} onChange={e => setGeciciYurtdisi(p => ({...p, min_fiyat: e.target.value}))}
              style={filtreInput} />
            <span style={{color:'var(--text-muted)',fontSize:13}}>—</span>
            <input type="number" placeholder="Max ₺" value={geciciYurtdisi.max_fiyat} onChange={e => setGeciciYurtdisi(p => ({...p, max_fiyat: e.target.value}))}
              style={filtreInput} />
          </div>
        </div>
        <div style={filtreAyirici} />
        {/* Butonlar */}
        <div style={{display:'flex',gap:12,paddingTop:16}}>
          <button onClick={yurtdisiTemizle} style={{flex:1,padding:'14px',borderRadius:12,border:'1px solid var(--border)',background:'var(--bg-secondary)',color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:600,cursor:'pointer',minHeight:48}}>Temizle</button>
          <button onClick={yurtdisiUygula} style={{flex:2,padding:'14px',borderRadius:12,border:'none',background:'var(--success)',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',minHeight:48}}>Uygula</button>
        </div>
      </FiltrePanel>
    </div>
  )
}
