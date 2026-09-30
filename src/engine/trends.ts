import { addDays } from './dates'

export interface WeighIn {
  date: string
  weightKg: number
}

export interface AverageWeight {
  weightKg: number
  /** Weigh-ins that went into the average. */
  count: number
  /** True when no weigh-in fell in the last 7 days and the latest older one was used. */
  stale: boolean
}

/**
 * Mean of weigh-ins from the 7 days ending on `today` (inclusive). If none fall in that
 * window, falls back to the most recent earlier weigh-in. Returns null with no data.
 */
export function sevenDayAverage(logs: WeighIn[], today: string): AverageWeight | null {
  const from = addDays(today, -6)
  const inWindow = logs.filter((l) => l.date >= from && l.date <= today)
  if (inWindow.length > 0) {
    const sum = inWindow.reduce((s, l) => s + l.weightKg, 0)
    return { weightKg: sum / inWindow.length, count: inWindow.length, stale: false }
  }
  const older = logs.filter((l) => l.date < from).sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  return older ? { weightKg: older.weightKg, count: 1, stale: true } : null
}

/** For each weigh-in date, the mean of weigh-ins in the 7 days ending that day. */
export function movingAverage7(logs: readonly WeighIn[]): { date: string; avg: number }[] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((l) => {
    const from = addDays(l.date, -6)
    const win = sorted.filter((x) => x.date >= from && x.date <= l.date)
    return { date: l.date, avg: Math.round((win.reduce((s, x) => s + x.weightKg, 0) / win.length) * 100) / 100 }
  })
}

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y!, m! - 1, d!) / 86_400_000)
}

export interface WeeklyRate {
  kgPerWeek: number
  /** Relative to the mean weight in the window. */
  pctPerWeek: number
  count: number
  spanDays: number
}

/**
 * Weekly rate of change from a least-squares line through the weigh-ins of the last
 * `windowDays` days. Needs at least 4 weigh-ins spanning 10+ days, else null.
 */
export function weeklyRate(logs: readonly WeighIn[], today: string, windowDays = 28): WeeklyRate | null {
  const from = addDays(today, -(windowDays - 1))
  const pts = logs.filter((l) => l.date >= from && l.date <= today).map((l) => ({ x: dayNumber(l.date), y: l.weightKg }))
  if (pts.length < 4) return null
  const xs = pts.map((p) => p.x)
  const spanDays = Math.max(...xs) - Math.min(...xs)
  if (spanDays < 10) return null
  const n = pts.length
  const mx = xs.reduce((s, x) => s + x, 0) / n
  const my = pts.reduce((s, p) => s + p.y, 0) / n
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / pts.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  const kgPerWeek = slope * 7
  return { kgPerWeek: Math.round(kgPerWeek * 100) / 100, pctPerWeek: Math.round((kgPerWeek / my) * 10000) / 100, count: n, spanDays }
}

export type GoalKind = 'fat_loss' | 'muscle_gain' | 'recomp'

/** Expected weekly change, % of bodyweight (PRD §4.2 target rate band). */
export const GOAL_BANDS: Record<GoalKind, { lo: number; hi: number }> = {
  fat_loss: { lo: -1, hi: -0.5 },
  muscle_gain: { lo: 0.25, hi: 0.5 },
  recomp: { lo: -0.25, hi: 0.25 },
}

export type BandStatus = 'below' | 'inside' | 'above'

export function bandStatus(pctPerWeek: number, band: { lo: number; hi: number }): BandStatus {
  if (pctPerWeek < band.lo) return 'below'
  if (pctPerWeek > band.hi) return 'above'
  return 'inside'
}

/** The band's lower and upper weights on `date`, starting from `startKg` on `startDate`. */
export function bandAt(startKg: number, startDate: string, date: string, band: { lo: number; hi: number }): { lo: number; hi: number } {
  const weeks = (dayNumber(date) - dayNumber(startDate)) / 7
  return { lo: startKg * (1 + (band.lo / 100) * weeks), hi: startKg * (1 + (band.hi / 100) * weeks) }
}

export type ChartRange = '4w' | '12w' | 'all'

/** First date shown for a range; 'all' starts at the first weigh-in. */
export function rangeStart(range: ChartRange, today: string, firstDate: string | undefined): string {
  if (range === '4w') return addDays(today, -27)
  if (range === '12w') return addDays(today, -83)
  return firstDate ?? today
}
