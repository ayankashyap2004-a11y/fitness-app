/** Progress photos are stored at most this many pixels on the long side (PRD §4.8). */
export const PHOTO_MAX_PX = 1080
export const PHOTO_JPEG_QUALITY = 0.8

export type PhotoAngle = 'front' | 'side' | 'back'
export const PHOTO_ANGLES: readonly PhotoAngle[] = ['front', 'side', 'back']

/** Scales to fit within `max` on the long side, keeping the aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, max = PHOTO_MAX_PX): { width: number; height: number } {
  const long = Math.max(width, height)
  if (long <= max) return { width, height }
  const k = max / long
  return { width: Math.round(width * k), height: Math.round(height * k) }
}

export interface PhotoLike {
  id?: number
  date: string
  angle: PhotoAngle
}

/** Newest date first; one slot per angle. */
export function groupByDate<T extends PhotoLike>(photos: readonly T[]): { date: string; byAngle: Partial<Record<PhotoAngle, T>> }[] {
  const map = new Map<string, Partial<Record<PhotoAngle, T>>>()
  for (const p of photos) {
    const g = map.get(p.date) ?? {}
    g[p.angle] = p
    map.set(p.date, g)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, byAngle]) => ({ date, byAngle }))
}

/** Photo reminder: due when on and the last photo is 7+ days old (or there's none). */
export function photoReminderDue(enabled: boolean, lastPhotoDate: string | undefined, today: string, everyDays = 7): boolean {
  if (!enabled) return false
  if (!lastPhotoDate) return true
  const d = (iso: string) => {
    const [y, m, dd] = iso.split('-').map(Number)
    return Date.UTC(y!, m! - 1, dd!) / 86_400_000
  }
  return d(today) - d(lastPhotoDate) >= everyDays
}

export const REMINDER_HOUR = 9

/**
 * When to schedule the next photo-reminder notification (APK, where notifications can fire
 * while the app is closed): 9:00 on the day it falls due; if that's already passed, soon
 * (unless one was shown today), else 9:00 tomorrow. Null when reminders are off.
 */
export function nextReminderAt(
  enabled: boolean,
  lastPhotoDate: string | undefined,
  now: Date,
  notifiedOn: string | undefined,
  everyDays = 7,
): { at: Date; immediate: boolean } | null {
  if (!enabled) return null
  const at9 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), REMINDER_HOUR, 0, 0, 0)
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  let due: Date
  if (lastPhotoDate) {
    const [y, m, d] = lastPhotoDate.split('-').map(Number)
    due = at9(new Date(y!, m! - 1, d! + everyDays))
  } else {
    due = at9(now)
  }
  if (due > now) return { at: due, immediate: false }
  if (notifiedOn !== todayIso) return { at: new Date(now.getTime() + 5_000), immediate: true }
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { at: at9(tomorrow), immediate: false }
}
