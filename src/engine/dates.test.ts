import { describe, expect, it } from 'vitest'
import { addDays, ageOn, toISODate } from './dates'

describe('toISODate', () => {
  it('formats local date with zero padding', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-09-28', 5)).toBe('2026-10-03')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('handles leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('rejects malformed input', () => {
    expect(() => addDays('30/09/2026', 1)).toThrow()
  })
})

describe('ageOn', () => {
  it('counts a birthday on the day itself', () => {
    expect(ageOn('2003-09-30', '2026-09-30')).toBe(23)
  })

  it('does not count a birthday that has not happened yet', () => {
    expect(ageOn('2003-10-01', '2026-09-30')).toBe(22)
    expect(ageOn('2003-09-30', '2026-09-29')).toBe(22)
  })
})
