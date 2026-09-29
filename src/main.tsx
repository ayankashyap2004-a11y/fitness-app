import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { db } from './db/schema'
import { ensureAppMeta } from './db/persist'
import './index.css'

registerSW({ immediate: true })

ensureAppMeta(db).catch((err: unknown) => console.error('Storage setup failed', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
