import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { GOAL_BANDS, bandAt, bandStatus, movingAverage7, rangeStart, sevenDayAverage, weeklyRate } from './trends'

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

describe('movingAverage7', () => {
  it('averages the 7 days ending on each weigh-in', () => {
    const logs = [
      { date: '2026-09-02', weightKg: 71 },
      { date: '2026-09-01', weightKg: 72 },
      { date: '2026-09-08', weightKg: 70 }, // 7-day window 02–08: 71 and 70
    ]
    expect(movingAverage7(logs)).toEqual([
      { date: '2026-09-01', avg: 72 },
      { date: '2026-09-02', avg: 71.5 },
      { date: '2026-09-08', avg: 70.5 },
    ])
  })
})

describe('weeklyRate', () => {
  it('fits a line through the last 28 days (kg and % per week)', () => {
    // Exactly −0.1 kg/day → −0.7 kg/week around 70 kg ≈ −1 %/week
    const logs = Array.from({ length: 15 }, (_, i) => ({ date: addDays('2026-09-16', i), weightKg: 70.7 - 0.1 * i }))
    const r = weeklyRate(logs, '2026-09-30')!
    expect(r.kgPerWeek).toBeCloseTo(-0.7, 5)
    expect(r.pctPerWeek).toBeCloseTo(-1.01, 1)
    expect(r.count).toBe(15)
  })

  it('ignores weigh-ins outside the window', () => {
    const logs = [
      { date: '2026-08-01', weightKg: 90 },
      { date: '2026-09-10', weightKg: 70 },
      { date: '2026-09-17', weightKg: 70 },
      { date: '2026-09-24', weightKg: 70 },
      { date: '2026-09-30', weightKg: 70 },
    ]
    expect(weeklyRate(logs, '2026-09-30')?.kgPerWeek).toBe(0)
  })

  it('needs 4+ weigh-ins over 10+ days', () => {
    expect(weeklyRate([{ date: '2026-09-28', weightKg: 70 }, { date: '2026-09-29', weightKg: 70 }, { date: '2026-09-30', weightKg: 69 }], '2026-09-30')).toBeNull()
    const tight = [25, 26, 27, 28, 29, 30].map((d) => ({ date: `2026-09-${d}`, weightKg: 70 }))
    expect(weeklyRate(tight, '2026-09-30')).toBeNull()
  })
})

describe('goal bands', () => {
  it('uses the PRD rates', () => {
    expect(GOAL_BANDS.fat_loss).toEqual({ lo: -1, hi: -0.5 })
    expect(GOAL_BANDS.muscle_gain).toEqual({ lo: 0.25, hi: 0.5 })
  })

  it('says whether the trend is inside, above or below', () => {
    const band = GOAL_BANDS.fat_loss
    expect(bandStatus(-0.7, band)).toBe('inside')
    expect(bandStatus(-0.2, band)).toBe('above') // losing too slowly
    expect(bandStatus(-1.4, band)).toBe('below') // losing too fast
  })

  it('projects the band from a starting weight', () => {
    expect(bandAt(70, '2026-09-02', '2026-09-30', GOAL_BANDS.fat_loss)).toEqual({ lo: 67.2, hi: 68.6 })
  })

  it('picks range starts', () => {
    expect(rangeStart('4w', '2026-09-30', '2026-01-01')).toBe('2026-09-03')
    expect(rangeStart('12w', '2026-09-30', '2026-01-01')).toBe('2026-07-09')
    expect(rangeStart('all', '2026-09-30', '2026-01-01')).toBe('2026-01-01')
  })
})
