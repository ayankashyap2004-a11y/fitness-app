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
