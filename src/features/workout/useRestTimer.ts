import { useCallback, useEffect, useRef, useState } from 'react'
import { restRemaining } from '../../engine/workout'

// Transient UI state (CLAUDE.md allows small UI prefs in localStorage). Storing the end
// time rather than a countdown keeps it right across tab switches and phone sleep.
const KEY = 'ui.restEndsAt'

function read(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

function write(v: number | null) {
  try {
    if (v === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(v))
  } catch {
    // storage unavailable: timer still works for this view
  }
}

export interface RestTimer {
  /** Seconds left, or null when no rest is running. */
  remaining: number | null
  start: (sec: number) => void
  add: (sec: number) => void
  skip: () => void
}

export function useRestTimer(): RestTimer {
  const [endsAt, setEndsAt] = useState<number | null>(read)
  const [now, setNow] = useState(() => Date.now())
  const buzzed = useRef(false)

  useEffect(() => {
    if (endsAt === null) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [endsAt])

  const remaining = endsAt === null ? null : restRemaining(endsAt, now)

  useEffect(() => {
    if (remaining === 0 && !buzzed.current) {
      buzzed.current = true
      navigator.vibrate?.([200, 100, 200])
    }
  }, [remaining])

  const set = useCallback((v: number | null) => {
    buzzed.current = false
    setNow(Date.now())
    setEndsAt(v)
    write(v)
  }, [])

  return {
    remaining,
    start: useCallback((sec: number) => set(Date.now() + sec * 1000), [set]),
    add: useCallback((sec: number) => set(Math.max(Date.now(), read() ?? Date.now()) + sec * 1000), [set]),
    skip: useCallback(() => set(null), [set]),
  }
}
