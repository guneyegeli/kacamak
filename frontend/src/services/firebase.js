import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

const isNative = Capacitor.isNativePlatform()

// --- Native (iOS / Android) ---

async function nativeBildirimIzniIste() {
  const izin = await PushNotifications.requestPermissions()
  if (izin.receive !== 'granted') {
    // Bildirim izni reddedildi
    return null
  }

  return new Promise((resolve) => {
    PushNotifications.addListener('registration', (token) => {
      // FCM Token alındı
      resolve(token.value)
    })
    PushNotifications.addListener('registrationError', (err) => {
      // Kayıt hatası
      resolve(null)
    })
    PushNotifications.register()
  })
}

function nativeBildirimDinle(callback) {
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    // Foreground bildirim alındı
    callback({
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
    })
  })

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // Bildirime tıklandı
  })

  return () => PushNotifications.removeAllListeners()
}

// --- Web (tarayici) ---

async function webBildirimIzniIste() {
  if (!('Notification' in window)) {
    // Bu tarayıcı bildirimleri desteklemiyor
    return null
  }

  const izin = await Notification.requestPermission()
  if (izin !== 'granted') {
    // Bildirim izni reddedildi
    return null
  }

  try {
    const { initializeApp } = await import('firebase/app')
    const { getMessaging, getToken, onMessage: _onMessage } = await import('firebase/messaging')

    const app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    })
    const messaging = getMessaging(app)
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    const token = await getToken(messaging, { vapidKey })
    // FCM Token alındı (web)

    // Store messaging instance for listener
    window.__fcmMessaging = messaging
    return token
  } catch (err) {
    // Token alınamadı
    return null
  }
}

function webBildirimDinle(callback) {
  if (!window.__fcmMessaging) return () => {}
  let unsubscribe = null
  import('firebase/messaging').then(({ onMessage }) => {
    unsubscribe = onMessage(window.__fcmMessaging, (payload) => {
      callback(payload)
    })
  })
  return () => { if (unsubscribe) unsubscribe() }
}

// --- Public API ---

export const bildirimIzniIste = isNative ? nativeBildirimIzniIste : webBildirimIzniIste
export const bildirimDinle = isNative ? nativeBildirimDinle : webBildirimDinle
