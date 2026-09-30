import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addDays } from '../engine/dates'
import { weekStart } from '../engine/deload'
import { addCardio, deleteCardio, updateCardio } from './cardio'
import { getDeloadStatus, skipDeload, unskipDeload } from './deload'
import { ensureAppMeta } from './persist'
import { FitnessDB } from './schema'
import { seedLibrary } from './seed'
import { weekSummary } from './week'
import { finishSession, logSet, startSession } from './workout'

let db: FitnessDB

beforeEach(async () => {
  db = new FitnessDB(`test-${crypto.randomUUID()}`)
  await db.open()
  await ensureAppMeta(db, undefined)
  await seedLibrary(db)
})

afterEach(async () => {
  await db.delete()
})

const today = '2026-09-30' // Wednesday; week starts 2026-09-28
const noon = (iso: string) => new Date(`${iso}T12:00:00`)

/** `weeks` past weeks with 4 completed sessions each. */
async function trainFor(weeks: number) {
  for (let w = 1; w <= weeks; w++) {
    const monday = addDays(weekStart(today), -7 * w)
    for (let i = 0; i < 4; i++) {
      const id = await startSession(db, i % 5, 'gym', noon(addDays(monday, i)))
      await finishSession(db, id, noon(addDays(monday, i)))
    }
  }
}

describe('deloads', () => {
  it('after 6 training weeks, new sessions are deloads at half the sets', async () => {
    await trainFor(6)
    expect((await getDeloadStatus(db, today)).state).toBe('due')
    const id = await startSession(db, 0, 'gym', noon(today))
    const s = (await db.workoutSessions.get(id))!
    expect(s.isDeload).toBe(true)
    // Push: bench 3 → 2, lateral raise 4 → 2, cable fly 2 → 1
    expect(s.plan.map((p) => p.sets)).toEqual([2, 2, 2, 2, 2, 1])
  })

  it('stays a deload week after the first deload session', async () => {
    await trainFor(6)
    const first = await startSession(db, 0, 'gym', noon(today))
    await finishSession(db, first, noon(today))
    expect((await getDeloadStatus(db, today)).state).toBe('active')
    const second = await startSession(db, 1, 'gym', noon(addDays(today, 1)))
    expect((await db.workoutSessions.get(second))!.isDeload).toBe(true)
  })

  it('skip gives a normal week; undo brings the deload back', async () => {
    await trainFor(6)
    await skipDeload(db, today)
    expect((await getDeloadStatus(db, today)).state).toBe('skipped')
    const id = await startSession(db, 0, 'gym', noon(today))
    const s = (await db.workoutSessions.get(id))!
    expect(s.isDeload).toBe(false)
    expect(s.plan[0]!.sets).toBe(3)
    await unskipDeload(db)
    expect((await getDeloadStatus(db, today)).state).toBe('due')
  })

  it('is not due before 6 weeks', async () => {
    await trainFor(5)
    expect(await getDeloadStatus(db, today)).toMatchObject({ state: 'normal', trainingWeeks: 5 })
  })
})

describe('cardio', () => {
  it('adds, edits and deletes, trimming empty notes', async () => {
    const id = await addCardio(db, { date: today, type: 'walk', durationMin: 30, note: '  ' })
    expect(await db.cardioLogs.get(id)).toEqual({ id, date: today, type: 'walk', durationMin: 30 })
    await updateCardio(db, id, { date: today, type: 'run', durationMin: 25, distanceKm: 4 })
    expect(await db.cardioLogs.get(id)).toMatchObject({ type: 'run', distanceKm: 4 })
    await deleteCardio(db, id)
    expect(await db.cardioLogs.count()).toBe(0)
  })

  it('keeps speed/incline only for walk/run and intensity only for pickleball', async () => {
    const run = await addCardio(db, { date: today, type: 'run', durationMin: 30, speedKmh: 10, inclinePct: 2, intensity: 'singles', kcalEstimate: 400 })
    expect(await db.cardioLogs.get(run)).toEqual({ id: run, date: today, type: 'run', durationMin: 30, speedKmh: 10, inclinePct: 2, kcalEstimate: 400 })
    const pb = await addCardio(db, { date: today, type: 'pickleball', durationMin: 60, speedKmh: 8, intensity: 'doubles', kcalEstimate: 301 })
    expect(await db.cardioLogs.get(pb)).toEqual({ id: pb, date: today, type: 'pickleball', durationMin: 60, intensity: 'doubles', kcalEstimate: 301 })
  })
})

describe('weekSummary', () => {
  it('counts this week’s sessions, cardio and volume against the plan', async () => {
    await trainFor(1) // last week: not counted
    const id = await startSession(db, 0, 'gym', noon('2026-09-28'))
    for (const setNo of [1, 2, 3]) {
      await logSet(db, { sessionId: id, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo, weightKg: 60, reps: 8 })
    }
    await finishSession(db, id, noon('2026-09-28'))
    await addCardio(db, { date: '2026-09-29', type: 'walk', durationMin: 40, distanceKm: 3.5 })
    await addCardio(db, { date: '2026-09-21', type: 'run', durationMin: 30 }) // last week

    const w = await weekSummary(db, today)
    expect(w.weekStart).toBe('2026-09-28')
    expect(w.sessionsDone).toBe(1)
    expect(w.cardio).toEqual({ sessions: 1, minutes: 40, km: 3.5, kcal: 0 })
    expect(w.actual).toEqual({ chest: 3, triceps: 1.5, front_delts: 1.5 })
    expect(w.planned).toMatchObject({ chest: 13, back: 14, triceps: 12 })
  })

  it('halves the plan in a deload week', async () => {
    await trainFor(6)
    const w = await weekSummary(db, today)
    expect(w.deload.state).toBe('due')
    expect(w.planned.chest).toBeLessThan(13)
  })
})
