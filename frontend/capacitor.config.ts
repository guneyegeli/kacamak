import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kacamak.app',
  appName: 'Kaçamak',
  webDir: 'dist',
  server: {
    // Dev sırasında live reload için — production build'de kaldır
    // url: 'http://192.168.1.X:5173',
    // cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
