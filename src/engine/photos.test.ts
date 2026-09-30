import { describe, expect, it } from 'vitest'
import { fitWithin, groupByDate, photoReminderDue } from './photos'

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
