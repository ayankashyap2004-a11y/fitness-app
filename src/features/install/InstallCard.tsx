import { useState } from 'react'
import { Button } from '../../components/Button'
import { isIOS, promptInstall, useInstallState } from './installPrompt'

const DISMISS_KEY = 'ui.installDismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

interface Props {
  /** On Today the card can be dismissed; in Settings it always shows until installed. */
  dismissible?: boolean
}

/** Explicit "Install app" (Chrome's own prompt doesn't always appear), with manual steps as a fallback. */
export function InstallCard({ dismissible = false }: Props) {
  const state = useInstallState()
  const [dismissed, setDismissed] = useState(readDismissed)
  const [showSteps, setShowSteps] = useState(false)

  if (state === 'installed' || (dismissible && dismissed)) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <div>
        <p className="font-medium">Install Fitness on your phone</p>
        <p className="text-sm text-muted">Get a home-screen icon, full-screen app and offline use. Your data stays on this phone.</p>
      </div>

      <div className="flex gap-2">
        {state === 'ready' ? (
          <Button className="flex-[2]" onClick={() => promptInstall()}>
            Install app
          </Button>
        ) : (
          <Button className="flex-[2]" onClick={() => setShowSteps((v) => !v)}>
            {showSteps ? 'Hide steps' : 'How to install'}
          </Button>
        )}
        {dismissible && (
          <Button variant="secondary" className="flex-1" onClick={dismiss}>
            Not now
          </Button>
        )}
      </div>

      {state === 'manual' && showSteps && (isIOS() ? <IOSSteps /> : <AndroidSteps />)}
    </div>
  )
}

function AndroidSteps() {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      <li>
        Make sure this page is open in <strong>Chrome</strong> itself. If you opened the link from WhatsApp or Gmail, tap their menu → <strong>Open in Chrome</strong>.
      </li>
      <li>
        Tap <strong>⋮</strong> (top right) → <strong>Add to Home screen</strong> or <strong>Install app</strong>.
      </li>
      <li>
        Choose <strong>Install</strong>. The icon appears on your home screen and in the app drawer.
      </li>
      <li className="text-muted">Incognito tabs can't install apps.</li>
    </ol>
  )
}

/** iOS has no install prompt; installing is always manual from the Share menu. */
function IOSSteps() {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      <li>
        Open this page in <strong>Safari</strong> (or Chrome on iOS 16.4+). If it opened inside Instagram, WhatsApp or similar, use their menu → <strong>Open in Safari</strong>.
      </li>
      <li>
        Tap the <strong>Share</strong> button (square with an arrow ↑).
      </li>
      <li>
        Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
      </li>
      <li className="text-muted">Private browsing can't add apps. Your data stays on this iPhone; back up from Settings → Backup.</li>
    </ol>
  )
}
