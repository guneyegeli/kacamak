const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const KULLANICI_ID = 1

export const api = {
  firsatlar: () => fetch(`${BASE}/api/firsatlar`).then(r => r.json()),
  firsatDetay: (id) => fetch(`${BASE}/api/firsatlar/${id}`).then(r => r.json()),
  tercihGetir: () => fetch(`${BASE}/api/tercihler/${KULLANICI_ID}`).then(r => r.json()),
  tercihGuncelle: (data) => fetch(`${BASE}/api/tercihler/${KULLANICI_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.hata || 'Sunucu hatasi') }); return r.json() }),
  fcmTokenGuncelle: (fcmToken) => fetch(`${BASE}/api/fcm-token`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kullanici_id: KULLANICI_ID, fcm_token: fcmToken })
  }).then(r => r.json()),
  testBildirim: () => fetch(`${BASE}/api/bildirim/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kullanici_id: KULLANICI_ID })
  }).then(r => r.json()),
  foto: (dest) => fetch(`${BASE}/api/foto/${dest}`).then(r => r.json()),
  galeri: (dest, count = 6) => fetch(`${BASE}/api/foto/galeri/${dest}?count=${count}`).then(r => r.json()),
  aktiviteler: (dest) => fetch(`${BASE}/api/aktiviteler/${dest}`).then(r => r.json()),
  harita: (dest) => fetch(`${BASE}/api/harita/${dest}`).then(r => r.json()),
  videolar: (dest) => fetch(`${BASE}/api/videolar/${dest}`).then(r => r.json()),
  alternatifTarihler: (id) => fetch(`${BASE}/api/firsatlar/${id}/alternatifler`).then(r => r.json()),
  benzerFirsatlar: (id) => fetch(`${BASE}/api/firsatlar/${id}/benzer`).then(r => r.json()),
}
