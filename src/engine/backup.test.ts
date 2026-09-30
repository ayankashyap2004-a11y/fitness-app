import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, backupDue, backupFileName, checkManifest, describeCounts } from './backup'

describe('backupDue', () => {
  it('is due 14+ days after the last export', () => {
    expect(backupDue('2026-09-16', '2026-01-01T00:00:00Z', '2026-09-30')).toBe(true)
    expect(backupDue('2026-09-17', '2026-01-01T00:00:00Z', '2026-09-30')).toBe(false)
  })

  it('counts from first launch when never exported', () => {
    expect(backupDue(undefined, '2026-09-16T08:00:00.000Z', '2026-09-30')).toBe(true)
    expect(backupDue(undefined, '2026-09-30T04:15:09.426Z', '2026-09-30')).toBe(false)
    expect(backupDue(undefined, undefined, '2026-09-30')).toBe(false)
  })
})

describe('checkManifest', () => {
  const good = { format: BACKUP_FORMAT, formatVersion: 1, dbVersion: 2, exportedAt: '2026-09-30T10:00:00Z', counts: { foodLog: 3 } }

  it('accepts a backup from this or an older schema', () => {
    expect(checkManifest(good, 2).ok).toBe(true)
    expect(checkManifest({ ...good, dbVersion: 1 }, 2).ok).toBe(true)
  })

  it('rejects other files, newer versions and damaged manifests', () => {
    expect(checkManifest({ format: 'something-else' }, 2)).toEqual({ ok: false, error: "This isn't a backup from this app." })
    expect(checkManifest(null, 2).ok).toBe(false)
    expect(checkManifest({ ...good, dbVersion: 3 }, 2)).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) })
    expect(checkManifest({ ...good, formatVersion: 2 }, 2)).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) })
    expect(checkManifest({ ...good, counts: undefined }, 2)).toMatchObject({ ok: false, error: expect.stringMatching(/damaged/) })
  })
})

describe('describeCounts', () => {
  it('lists non-empty tables in plain words', () => {
    expect(describeCounts({ foodLog: 142, weightLogs: 1, workoutSessions: 18, setLogs: 0, progressPhotos: 6, archetypes: 92 })).toEqual([
      '142 food entries',
      '1 weigh-in',
      '18 workouts',
      '6 photos',
    ])
  })
})

describe('backupFileName', () => {
  it('includes the date', () => {
    expect(backupFileName('2026-09-30')).toBe('fitness-backup-2026-09-30.zip')
  })
})
