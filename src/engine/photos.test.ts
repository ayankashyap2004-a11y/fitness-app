import { describe, expect, it } from 'vitest'
import { fitWithin, groupByDate, nextReminderAt, photoReminderDue } from './photos'

describe('fitWithin', () => {
  it('shrinks the long side to 1080 px, keeping the ratio', () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 810, height: 1080 })
    expect(fitWithin(4032, 3024)).toEqual({ width: 1080, height: 810 })
  })

  it('never upscales', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('groupByDate', () => {
  it('groups by date, newest first, one per angle', () => {
    const g = groupByDate([
      { id: 1, date: '2026-09-23', angle: 'front' as const },
      { id: 2, date: '2026-09-30', angle: 'side' as const },
      { id: 3, date: '2026-09-30', angle: 'front' as const },
    ])
    expect(g.map((x) => x.date)).toEqual(['2026-09-30', '2026-09-23'])
    expect(g[0]!.byAngle.front?.id).toBe(3)
    expect(g[0]!.byAngle.back).toBeUndefined()
  })
})

describe('photoReminderDue', () => {
  it('is due 7+ days after the last photo, only when enabled', () => {
    expect(photoReminderDue(true, '2026-09-23', '2026-09-30')).toBe(true)
    expect(photoReminderDue(true, '2026-09-24', '2026-09-30')).toBe(false)
    expect(photoReminderDue(true, undefined, '2026-09-30')).toBe(true)
    expect(photoReminderDue(false, undefined, '2026-09-30')).toBe(false)
  })
})

describe('nextReminderAt', () => {
  const now = new Date(2026, 8, 30, 14, 0) // 30 Sep 2026, 14:00 local

  it('is off when disabled', () => {
    expect(nextReminderAt(false, '2026-09-01', now, undefined)).toBeNull()
  })

  it('schedules 9:00 on the due day when that is still ahead', () => {
    expect(nextReminderAt(true, '2026-09-28', now, undefined)).toEqual({ at: new Date(2026, 9, 5, 9, 0), immediate: false })
  })

  it('fires soon when already due and not yet shown today', () => {
    const r = nextReminderAt(true, '2026-09-20', now, '2026-09-29')!
    expect(r.immediate).toBe(true)
    expect(r.at.getTime() - now.getTime()).toBe(5000)
  })

  it('waits until 9:00 tomorrow if one was already shown today', () => {
    expect(nextReminderAt(true, '2026-09-20', now, '2026-09-30')).toEqual({ at: new Date(2026, 9, 1, 9, 0), immediate: false })
  })

  it('with no photos yet, reminds today (or tomorrow if already shown)', () => {
    const early = new Date(2026, 8, 30, 7, 0)
    expect(nextReminderAt(true, undefined, early, undefined)).toEqual({ at: new Date(2026, 8, 30, 9, 0), immediate: false })
    expect(nextReminderAt(true, undefined, now, undefined)?.immediate).toBe(true)
  })
})
