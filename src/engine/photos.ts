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
