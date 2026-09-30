import 'fake-indexeddb/auto'
import { strToU8, unzipSync, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, readBackup, restoreBackup } from './backup'
import { addCardio } from './cardio'
import { addEntry, setUserOverride } from './food'
import { ensureAppMeta } from './persist'
import { savePhoto } from './photos'
import { completeOnboarding } from './profile'
import { FitnessDB } from './schema'
import { seedLibrary } from './seed'
import { finishSession, logSet, startSession } from './workout'
import { resolveFood } from '../engine/food'

const dbs: FitnessDB[] = []

async function freshDb() {
  const db = new FitnessDB(`test-${crypto.randomUUID()}`)
  dbs.push(db)
  await db.open()
  await ensureAppMeta(db, undefined)
  await seedLibrary(db)
  return db
}

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete()
})

let source: FitnessDB

beforeEach(async () => {
  source = await freshDb()
  await completeOnboarding(
    source,
    { name: 'Ayan', sex: 'male', dob: '2003-05-10', heightCm: '175', weightKg: '70', activityLevel: 'moderate', goal: 'fat_loss', intensity: 'moderate' },
    '2026-09-30',
  )
  const item = (await source.foodItems.get('dal-tadka'))!
  const dal = resolveFood(item, await source.archetypes.get(item.archetypeId!))!
  await addEntry(source, '2026-09-30', 'lunch', dal, { qty: 1.5, unit: dal.units[0]!.unit })
  await setUserOverride(source, 'sev-tamatar', { kcal: 320 })
  const sid = await startSession(source, 0, 'gym', new Date('2026-09-30T07:00:00Z'))
  await logSet(source, { sessionId: sid, planKey: 'push-1', exerciseId: 'barbell-bench-press', setNo: 1, weightKg: 60, reps: 8 })
  await finishSession(source, sid, new Date('2026-09-30T08:00:00Z'))
  await addCardio(source, { date: '2026-09-30', type: 'run', durationMin: 30, speedKmh: 10, kcalEstimate: 387 })
  await savePhoto(source, '2026-09-30', 'front', new Blob([new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])], { type: 'image/jpeg' }))
})

describe('backup round trip', () => {
  it('exports every table plus photos, and records the backup date', async () => {
    const { bytes, fileName, manifest } = await exportBackup(source, new Date('2026-09-30T12:00:00Z'))
    expect(fileName).toBe('fitness-backup-2026-09-30.zip')
    expect(manifest.counts).toMatchObject({ profile: 1, weightLogs: 1, foodLog: 1, workoutSessions: 1, setLogs: 1, cardioLogs: 1, progressPhotos: 1 })
    expect(Object.keys(unzipSync(bytes)).sort()).toEqual(['data.json', 'photos/1.jpg'])
    expect((await source.appMeta.get(1))?.lastBackupDate).toBe('2026-09-30')
  })

  it('restores an exact copy on a fresh device, photos included', async () => {
    const { bytes } = await exportBackup(source, new Date('2026-09-30T12:00:00Z'))
    const target = await freshDb()
    const read = readBackup(bytes, target.verno)
    if (!read.ok) throw new Error(read.error)
    await restoreBackup(target, read.backup)

    expect(await target.profile.get(1)).toEqual(await source.profile.get(1))
    expect(await target.foodLog.toArray()).toEqual(await source.foodLog.toArray())
    expect(await target.setLogs.toArray()).toEqual(await source.setLogs.toArray())
    expect(await target.cardioLogs.toArray()).toEqual(await source.cardioLogs.toArray())
    expect((await target.foodItems.get('sev-tamatar'))?.userOverride).toEqual({ kcal: 320 })
    const photo = (await target.progressPhotos.toArray())[0]!
    expect(photo).toMatchObject({ id: 1, date: '2026-09-30', angle: 'front' })
    expect([...new Uint8Array(await photo.blob.arrayBuffer())]).toEqual([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9])
    expect(photo.blob.type).toBe('image/jpeg')
    expect((await target.appMeta.get(1))?.lastBackupDate).toBe('2026-09-30')
  })

  it('replaces existing data rather than merging', async () => {
    const { bytes } = await exportBackup(source)
    const target = await freshDb()
    await target.weightLogs.put({ date: '2026-01-01', weightKg: 90 })
    const read = readBackup(bytes, target.verno)
    if (!read.ok) throw new Error(read.error)
    await restoreBackup(target, read.backup)
    expect(await target.weightLogs.toArray()).toEqual([{ date: '2026-09-30', weightKg: 70 }])
  })
})

describe('readBackup', () => {
  it('rejects a non-zip file', () => {
    expect(readBackup(strToU8('hello'), 2)).toEqual({ ok: false, error: "That file isn't a valid .zip backup." })
  })

  it('rejects a zip from something else', () => {
    expect(readBackup(zipSync({ 'notes.txt': strToU8('hi') }), 2)).toEqual({ ok: false, error: "This isn't a backup from this app." })
  })

  it('rejects a backup from a newer app', async () => {
    const { bytes } = await exportBackup(source)
    expect(readBackup(bytes, 1)).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) })
  })

  it('rejects a backup with a missing photo', async () => {
    const { bytes } = await exportBackup(source)
    const files = unzipSync(bytes)
    delete files['photos/1.jpg']
    expect(readBackup(zipSync(files), 2)).toMatchObject({ ok: false, error: expect.stringMatching(/missing a photo/) })
  })
})
