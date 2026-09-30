import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Android APK: the built web app (dist/) is bundled inside the APK and runs in the system
 * WebView. All data lives in the app's private storage, independent of Chrome.
 */
const config: CapacitorConfig = {
  // Permanent: changing it makes Android treat the app as a different one (no updates, data lost).
  appId: 'com.ayankashyap.fitness',
  appName: 'Fitness',
  webDir: 'dist',
  android: {
    backgroundColor: '#0b0f14',
  },
  plugins: {
    SystemBars: {
      // index.html uses viewport-fit=cover and env(safe-area-inset-*), so draw edge-to-edge.
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
      // Light status-bar icons on the dark background.
      style: 'DARK',
    },
  },
}

export default config
