import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { deloadSets, deloadStatus, isDeloadWeek, weekStart, type SessionLite } from './deload'

describe('weekStart', () => {
  it('returns the Monday of the week', () => {
    expect(weekStart('2026-09-30')).toBe('2026-09-28') // Wednesday
    expect(weekStart('2026-09-28')).toBe('2026-09-28') // Monday
    expect(weekStart('2026-10-04')).toBe('2026-09-28') // Sunday
    expect(weekStart('2026-01-01')).toBe('2025-12-29') // across a year
  })
})

describe('deloadSets', () => {
  it('halves, rounding up, never below 1', () => {
    expect([1, 2, 3, 4, 5].map(deloadSets)).toEqual([1, 1, 2, 2, 3])
  })
})

/** `n` completed sessions in each of the `weeks` weeks before `today`'s week. */
function history(today: string, weeks: number, n: number): SessionLite[] {
  const out: SessionLite[] = []
  for (let w = 1; w <= weeks; w++) {
    const monday = addDays(weekStart(today), -7 * w)
    for (let i = 0; i < n; i++) out.push({ date: addDays(monday, i), completed: true, isDeload: false })
  }
  return out
}

const today = '2026-09-30'

describe('deloadStatus', () => {
  it('counts only weeks with 3+ completed sessions', () => {
    const light = history(today, 2, 2) // two weeks of 2 sessions: don't count
    const full = history(today, 1, 3).map((s) => ({ ...s, date: addDays(s.date, -21) }))
    expect(deloadStatus([...light, ...full], today).trainingWeeks).toBe(1)
  })

  it('ignores the current week and unfinished sessions', () => {
    const s: SessionLite[] = [
      { date: '2026-09-28', completed: true, isDeload: false },
      { date: '2026-09-29', completed: true, isDeload: false },
      { date: '2026-09-30', completed: true, isDeload: false },
      { date: '2026-09-22', completed: false, isDeload: false },
    ]
    expect(deloadStatus(s, today).trainingWeeks).toBe(0)
  })

  it('is due after 6 training weeks', () => {
    expect(deloadStatus(history(today, 5, 4), today)).toMatchObject({ state: 'normal', trainingWeeks: 5 })
    expect(deloadStatus(history(today, 6, 4), today)).toMatchObject({ state: 'due', trainingWeeks: 6, week: '2026-09-28' })
  })

  it('skip lasts one week, then it is due again with the count shown', () => {
    const s = history(today, 6, 4)
    expect(deloadStatus(s, today, '2026-09-28').state).toBe('skipped')
    // Next week, after training through the skipped week:
    const nextWeek = '2026-10-07'
    const withSkipped = [...s, ...history(nextWeek, 1, 4)]
    expect(deloadStatus(withSkipped, nextWeek, '2026-09-28')).toMatchObject({ state: 'due', trainingWeeks: 7 })
  })

  it('stays active for the rest of a week once a deload session is done', () => {
    const s = [...history(today, 6, 4), { date: '2026-09-29', completed: true, isDeload: true }]
    expect(deloadStatus(s, today).state).toBe('active')
    expect(isDeloadWeek(deloadStatus(s, today))).toBe(true)
  })

  it('resets the count after a deload week', () => {
    const before = history('2026-09-28', 6, 4) // six weeks ending 27 Sep
    const deload = { date: '2026-09-29', completed: true, isDeload: true }
    const after = history('2026-10-12', 1, 4) // week of 5 Oct
    const s = deloadStatus([...before, deload, ...after], '2026-10-14')
    expect(s).toMatchObject({ state: 'normal', trainingWeeks: 1 })
    expect(isDeloadWeek(s)).toBe(false)
  })
})
