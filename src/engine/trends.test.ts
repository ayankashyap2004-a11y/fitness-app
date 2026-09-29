import { describe, expect, it } from 'vitest'
import { sevenDayAverage } from './trends'

describe('sevenDayAverage', () => {
  it('averages weigh-ins in the 7 days ending today, inclusive', () => {
    const logs = [
      { date: '2026-09-23', weightKg: 80 }, // 7 days before: outside
      { date: '2026-09-24', weightKg: 71 }, // first day of window
      { date: '2026-09-27', weightKg: 70 },
      { date: '2026-09-30', weightKg: 69 }, // today
    ]
    expect(sevenDayAverage(logs, '2026-09-30')).toEqual({ weightKg: 70, count: 3, stale: false })
  })

  it('ignores future-dated entries', () => {
    const logs = [
      { date: '2026-09-30', weightKg: 70 },
      { date: '2026-10-01', weightKg: 90 },
    ]
    expect(sevenDayAverage(logs, '2026-09-30')?.weightKg).toBe(70)
  })

  it('falls back to the most recent older weigh-in when the window is empty', () => {
    const logs = [
      { date: '2026-09-01', weightKg: 72 },
      { date: '2026-09-10', weightKg: 71 },
    ]
    expect(sevenDayAverage(logs, '2026-09-30')).toEqual({ weightKg: 71, count: 1, stale: true })
  })

  it('returns null with no data', () => {
    expect(sevenDayAverage([], '2026-09-30')).toBeNull()
  })
})
