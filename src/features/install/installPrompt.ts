import { useSyncExternalStore } from 'react'
import { isNative } from '../../platform'

/** Chrome's `beforeinstallprompt` event (not in the standard DOM typings). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
let installedNow = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

// Registered at import time (from main.tsx, before React renders) so an early event isn't missed.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep it for our own Install button instead of relying on Chrome's occasional mini-infobar.
    e.preventDefault()
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installedNow = true
    emit()
  })
}

/** Running as the installed app (home-screen icon), not a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

type InstallState = 'installed' | 'ready' | 'manual'

function snapshot(): InstallState {
  // The APK is already an installed app.
  if (isNative || installedNow || isStandalone()) return 'installed'
  return deferred ? 'ready' : 'manual'
}

/**
 * 'ready': Chrome allows installing now, so promptInstall() opens its dialog.
 * 'manual': no prompt available (not offered yet, in-app browser, incognito): show steps.
 * 'installed': hide install UI.
 */
export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    snapshot,
    () => 'manual',
  )
}

/** Opens Chrome's install dialog. Resolves true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  await e.prompt()
  const { outcome } = await e.userChoice
  // A prompt event can only be used once.
  deferred = null
  emit()
  return outcome === 'accepted'
}
