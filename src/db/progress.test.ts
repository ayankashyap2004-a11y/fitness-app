import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { exerciseHistory, trainedExercises } from './history'
import { ensureAppMeta } from './persist'
import { deletePhoto, markReminderNotified, savePhoto, setPhotoReminder } from './photos'
import { deleteWeight, logWeight } from './profile'
import { FitnessDB } from './schema'
import { seedLibrary } from './seed'
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

describe('weigh-ins', () => {
  it('logs any date, replaces the same day, and deletes', async () => {
    await logWeight(db, '2026-09-20', 71)
    await logWeight(db, '2026-09-20', 70.8)
    await logWeight(db, '2026-09-30', 70)
    expect(await db.weightLogs.toArray()).toEqual([
      { date: '2026-09-20', weightKg: 70.8 },
      { date: '2026-09-30', weightKg: 70 },
    ])
    await deleteWeight(db, '2026-09-20')
    expect(await db.weightLogs.count()).toBe(1)
  })
})

describe('progress photos', () => {
  const jpeg = (n: number) => new Blob([new Uint8Array(n)], { type: 'image/jpeg' })

  it('keeps one photo per angle per day, replacing on retake', async () => {
    const a = await savePhoto(db, '2026-09-30', 'front', jpeg(10))
    const b = await savePhoto(db, '2026-09-30', 'front', jpeg(20))
    await savePhoto(db, '2026-09-30', 'side', jpeg(5))
    expect(b).toBe(a)
    expect(await db.progressPhotos.count()).toBe(2)
    const front = await db.progressPhotos.get(a)
    expect(front?.blob.size).toBe(20)
    await deletePhoto(db, a)
    expect(await db.progressPhotos.count()).toBe(1)
  })

  it('stores the reminder setting and the last notification date', async () => {
    await setPhotoReminder(db, true)
    await markReminderNotified(db, '2026-09-30')
    expect(await db.appMeta.get(1)).toMatchObject({ photoReminder: true, photoReminderNotifiedOn: '2026-09-30' })
  })
})

describe('exercise history', () => {
  it('lists completed sessions with their sets, newest first', async () => {
    const at = (iso: string) => new Date(iso)
    const s1 = await startSession(db, 0, 'gym', at('2026-09-23T07:00:00Z'))
    await logSet(db, { sessionId: s1, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 2, weightKg: 60, reps: 7 })
    await logSet(db, { sessionId: s1, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 1, weightKg: 60, reps: 8 })
    await finishSession(db, s1, at('2026-09-23T08:00:00Z'))

    const s2 = await startSession(db, 0, 'gym', at('2026-09-30T07:00:00Z'))
    await logSet(db, { sessionId: s2, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 1, weightKg: 62.5, reps: 6 })
    await logSet(db, { sessionId: s2, planKey: 'push-2', exerciseId: 'incline-db-press', setNo: 1, weightKg: 20, reps: 10 })
    await finishSession(db, s2, at('2026-09-30T08:00:00Z'))

    // An unfinished session is left out.
    const s3 = await startSession(db, 1, 'gym', at('2026-10-01T07:00:00Z'))
    await logSet(db, { sessionId: s3, planKey: 'pull-2', exerciseId: 'barbell-bench-press', setNo: 1, weightKg: 99, reps: 1 })

    const h = await exerciseHistory(db, 'barbell-bench-press')
    expect(h.map((e) => e.session.id)).toEqual([s2, s1])
    expect(h[1]!.sets.map((s) => [s.setNo, s.weightKg, s.reps])).toEqual([
      [1, 60, 8],
      [2, 60, 7],
    ])
    expect(await trainedExercises(db)).toEqual(['barbell-bench-press', 'incline-db-press'])
  })
})
