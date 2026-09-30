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
import { notifyPhotoReminderIfDue } from './features/progress/photoReminder'
import './index.css'

registerSW({ immediate: true })

ensureAppMeta(db)
  .then(() => seedLibrary(db))
  .then(() => notifyPhotoReminderIfDue(db, toISODate(new Date())))
  .catch((err: unknown) => console.error('Storage setup failed', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
