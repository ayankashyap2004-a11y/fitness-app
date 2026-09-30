import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { moveItem, summarize } from '../engine/workout'
import { ensureAppMeta } from './persist'
import { FitnessDB } from './schema'
import { seedLibrary } from './seed'
import {
  activeSession,
  addPlannedSet,
  deleteSet,
  discardSession,
  finishSession,
  lastTimeFor,
  logSet,
  resetTemplate,
  saveTemplate,
  setExerciseNote,
  startSession,
} from './workout'

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

const at = (iso: string) => new Date(iso)

describe('seeding', () => {
  it('loads the exercise library and the 5-day split', async () => {
    expect(await db.exercises.count()).toBe(47)
    expect((await db.workoutTemplates.toArray()).map((d) => d.name)).toEqual(['Push', 'Pull', 'Legs', 'Upper', 'Lower'])
  })

  it('does not overwrite an edited split on re-seed', async () => {
    const push = (await db.workoutTemplates.get(0))!
    await saveTemplate(db, { ...push, exercises: push.exercises.slice(0, 2) })
    await db.appMeta.update(1, { seedVersion: 'old' })
    await seedLibrary(db)
    expect((await db.workoutTemplates.get(0))!.exercises).toHaveLength(2)
  })
})

describe('sessions', () => {
  it('starts with a snapshot of the plan for the chosen mode', async () => {
    const id = await startSession(db, 0, 'home', at('2026-09-30T07:00:00Z'))
    const s = (await db.workoutSessions.get(id))!
    expect(s).toMatchObject({ templateDay: 0, dayName: 'Push', mode: 'home', completed: false, isDeload: false })
    expect(s.plan[0]).toMatchObject({ key: 'push-1', exerciseId: 'db-floor-press', sets: 3 })
  })

  it('only runs one session at a time', async () => {
    const a = await startSession(db, 0, 'gym')
    const b = await startSession(db, 2, 'gym')
    expect(b).toBe(a)
    expect((await activeSession(db))?.id).toBe(a)
  })

  it('logs, edits and deletes sets', async () => {
    const sid = await startSession(db, 0, 'gym')
    const base = { sessionId: sid, planKey: 'push-1', exerciseId: 'barbell-bench-press' }
    const id = await logSet(db, { ...base, setNo: 1, weightKg: 60, reps: 8, rir: 2 })
    const again = await logSet(db, { ...base, setNo: 1, weightKg: 60, reps: 9 })
    expect(again).toBe(id)
    expect(await db.setLogs.get(id)).toMatchObject({ reps: 9 })
    await deleteSet(db, id)
    expect(await db.setLogs.count()).toBe(0)
  })

  it('adds sets and notes to this session only', async () => {
    const sid = await startSession(db, 0, 'gym')
    await addPlannedSet(db, sid, 'push-4')
    await setExerciseNote(db, sid, 'push-1', 'left shoulder felt tight')
    const s = (await db.workoutSessions.get(sid))!
    expect(s.plan.find((p) => p.key === 'push-4')?.sets).toBe(5)
    expect(s.notes).toEqual({ 'push-1': 'left shoulder felt tight' })
    expect((await db.workoutTemplates.get(0))!.exercises.find((e) => e.key === 'push-4')?.sets).toBe(4)
    await setExerciseNote(db, sid, 'push-1', '  ')
    expect((await db.workoutSessions.get(sid))!.notes).toEqual({})
  })

  it('finishing records the duration and advances the rotation', async () => {
    const sid = await startSession(db, 4, 'gym', at('2026-09-30T07:00:00Z'))
    await finishSession(db, sid, at('2026-09-30T08:05:00Z'))
    expect(await db.workoutSessions.get(sid)).toMatchObject({ completed: true, durationSec: 3900 })
    expect((await db.appMeta.get(1))?.splitPointer).toBe(0) // wraps from Lower to Push
  })

  it('discarding removes the session and its sets without moving the rotation', async () => {
    const sid = await startSession(db, 1, 'gym')
    await logSet(db, { sessionId: sid, planKey: 'pull-1', exerciseId: 'lat-pulldown', setNo: 1, weightKg: 50, reps: 10 })
    await discardSession(db, sid)
    expect(await db.workoutSessions.count()).toBe(0)
    expect(await db.setLogs.count()).toBe(0)
    expect((await db.appMeta.get(1))?.splitPointer).toBe(0)
  })
})

describe('last time', () => {
  it('shows the previous completed session’s sets for the same exercise', async () => {
    const s1 = await startSession(db, 0, 'gym', at('2026-09-23T07:00:00Z'))
    await logSet(db, { sessionId: s1, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 1, weightKg: 60, reps: 8 })
    await logSet(db, { sessionId: s1, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 2, weightKg: 60, reps: 7 })
    await finishSession(db, s1, at('2026-09-23T08:00:00Z'))

    const s2 = await startSession(db, 0, 'gym', at('2026-09-30T07:00:00Z'))
    await logSet(db, { sessionId: s2, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 1, weightKg: 62.5, reps: 6 })

    const last = await lastTimeFor(db, ['barbell-bench-press', 'incline-db-press'], s2)
    expect(last.get('barbell-bench-press')!.map((s) => [s.weightKg, s.reps])).toEqual([
      [60, 8],
      [60, 7],
    ])
    expect(last.get('incline-db-press')).toEqual([])
  })

  it('ignores an unfinished session', async () => {
    const s1 = await startSession(db, 0, 'gym')
    await logSet(db, { sessionId: s1, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 1, weightKg: 60, reps: 8 })
    expect((await lastTimeFor(db, ['barbell-bench-press'])).get('barbell-bench-press')).toEqual([])
  })

  it('summarises a session', async () => {
    const sid = await startSession(db, 0, 'gym', at('2026-09-30T07:00:00Z'))
    await logSet(db, { sessionId: sid, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 1, weightKg: 60, reps: 8 })
    await logSet(db, { sessionId: sid, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 2, weightKg: 60, reps: 8 })
    await finishSession(db, sid, at('2026-09-30T07:50:00Z'))
    const s = (await db.workoutSessions.get(sid))!
    const sets = await db.setLogs.where('sessionId').equals(sid).toArray()
    expect(summarize(sets, s.startedAt, s.endedAt!)).toEqual({ totalSets: 2, volumeKg: 960, durationSec: 3000 })
  })
})

describe('template editing', () => {
  it('saves edits and resets a day to the default', async () => {
    const push = (await db.workoutTemplates.get(0))!
    await saveTemplate(db, { ...push, exercises: moveItem(push.exercises, 0, 1).map((e, i) => (i === 0 ? { ...e, sets: 4 } : e)) })
    const edited = (await db.workoutTemplates.get(0))!
    expect(edited.exercises[0]).toMatchObject({ key: 'push-2', sets: 4 })

    // A session started now uses the edited plan...
    const sid = await startSession(db, 0, 'gym')
    expect((await db.workoutSessions.get(sid))!.plan[0]!.key).toBe('push-2')

    await resetTemplate(db, 0)
    expect((await db.workoutTemplates.get(0))!.exercises[0]).toMatchObject({ key: 'push-1', sets: 3 })
    // ...and keeps its snapshot after a reset.
    expect((await db.workoutSessions.get(sid))!.plan[0]!.key).toBe('push-2')
  })
})
