import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
// Registers the install-prompt listener before React renders, so an early event isn't missed.
import './features/install/installPrompt'
import { db } from './db/schema'
import { ensureAppMeta } from './db/persist'
import { seedLibrary } from './db/seed'
import { toISODate } from './engine/dates'
import { syncPhotoReminder } from './features/progress/photoReminder'
import { isNative } from './platform'
import './index.css'

// The APK bundles every file already; the service worker is only for the web version.
if (!isNative) registerSW({ immediate: true })

ensureAppMeta(db)
  .then(() => seedLibrary(db))
  .then(() => syncPhotoReminder(db, toISODate(new Date())))
  .catch((err: unknown) => console.error('Storage setup failed', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
