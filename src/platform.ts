import { Capacitor } from '@capacitor/core'

/**
 * True inside the Android APK (Capacitor). There the app's files are bundled in the APK and
 * data lives in the app's private storage; browser-only features (service worker, install
 * prompt, <a download>, Web Share with files, SW notifications) are replaced by native plugins.
 */
export const isNative: boolean = Capacitor.isNativePlatform()
