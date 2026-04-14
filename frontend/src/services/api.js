const BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:5001'

function getKullaniciId() {
  let id = localStorage.getItem('kacamak_kullanici_id')
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem('kacamak_kullanici_id', id)
  }
  return id
}

const kullaniciId = getKullaniciId()

const handleResponse = async (r) => {
  const data = await r.json()
  if (!r.ok) throw new Error(data?.hata || 'Sunucu hatası')
  return data
}

export const api = {
  firsatlar: (filtreler = {}) => {
    const params = new URLSearchParams()
    if (filtreler.cikis) params.set('cikis', filtreler.cikis)
    if (filtreler.direkt) params.set('direkt', '1')
    if (filtreler.gidis_tarihi) params.set('gidis_tarihi', filtreler.gidis_tarihi)
    if (filtreler.donus_tarihi) params.set('donus_tarihi', filtreler.donus_tarihi)
    if (filtreler.varis) params.set('varis', filtreler.varis)
    if (filtreler.varis_bolge) params.set('varis_bolge', filtreler.varis_bolge)
    if (filtreler.varis_sehir) params.set('varis_sehir', filtreler.varis_sehir)
    if (filtreler.min_fiyat) params.set('min_fiyat', filtreler.min_fiyat)
    if (filtreler.max_fiyat) params.set('max_fiyat', filtreler.max_fiyat)
    if (filtreler.geceler) params.set('geceler', filtreler.geceler)
    if (filtreler.tip) params.set('tip', filtreler.tip)
    if (filtreler.siralama && filtreler.siralama !== 'varsayilan') params.set('siralama', filtreler.siralama)
    const qs = params.toString()
    return fetch(`${BASE}/api/firsatlar${qs ? `?${qs}` : ''}`).then(r => r.json())
  },
  firsatDetay: (id) => fetch(`${BASE}/api/firsatlar/${id}`).then(r => r.json()),
  tercihGetir: () => fetch(`${BASE}/api/tercihler/${kullaniciId}`).then(r => r.json()),
  tercihGuncelle: (data) => fetch(`${BASE}/api/tercihler/${kullaniciId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  fcmTokenGuncelle: (fcmToken) => fetch(`${BASE}/api/fcm-token`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kullanici_id: kullaniciId, fcm_token: fcmToken })
  }).then(r => r.json()),
  testBildirim: () => fetch(`${BASE}/api/bildirim/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kullanici_id: kullaniciId })
  }).then(r => r.json()),
  foto: (dest) => fetch(`${BASE}/api/foto/${dest}`).then(r => r.json()),
  galeri: (dest, count = 6) => fetch(`${BASE}/api/foto/galeri/${dest}?count=${count}`).then(r => r.json()),
  aktiviteler: (dest) => fetch(`${BASE}/api/aktiviteler/${dest}`).then(r => r.json()),
  harita: (dest) => fetch(`${BASE}/api/harita/${dest}`).then(r => r.json()),
  videolar: (dest) => fetch(`${BASE}/api/videolar/${dest}`).then(r => r.json()),
  alternatifTarihler: (id) => fetch(`${BASE}/api/firsatlar/${id}/alternatifler`).then(r => r.json()),
  benzerFirsatlar: (id) => fetch(`${BASE}/api/firsatlar/${id}/benzer`).then(r => r.json()),
  itineraryOlustur: (id) => fetch(`${BASE}/api/firsat/${id}/itinerary-olustur`, { method: 'POST' }).then(r => r.json()),
  kanalVideo: (dest) => fetch(`${BASE}/api/kanal-video/${dest}`).then(r => r.json()),
  otelAra: ({ sehir, checkin, checkout, yetiskin, cocuk }) => {
    const params = new URLSearchParams({ sehir, checkin, checkout })
    if (yetiskin) params.set('yetiskin', yetiskin)
    if (cocuk) params.set('cocuk', cocuk)
    return fetch(`${BASE}/api/otel-ara?${params}`).then(r => r.json())
  },
}
