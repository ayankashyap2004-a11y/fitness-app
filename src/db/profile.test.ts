import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ProfileDraft } from '../engine/profile'
import { completeOnboarding, draftFromProfile, logWeight, updateProfile } from './profile'
import { FitnessDB } from './schema'

let db: FitnessDB

beforeEach(async () => {
  db = new FitnessDB(`test-${crypto.randomUUID()}`)
  await db.open()
})

afterEach(async () => {
  await db.delete()
})

const draft: ProfileDraft = {
  name: ' Ayan ',
  sex: 'male',
  dob: '2003-05-10',
  heightCm: '175',
  weightKg: '72,5',
  activityLevel: 'moderate',
  goal: 'fat_loss',
  intensity: 'moderate',
}

describe('profile persistence', () => {
  it('onboarding saves the profile and the first weigh-in', async () => {
    await completeOnboarding(db, draft, '2026-09-30')
    expect(await db.profile.get(1)).toMatchObject({ name: 'Ayan', heightCm: 175, goal: 'fat_loss' })
    expect(await db.weightLogs.get('2026-09-30')).toEqual({ date: '2026-09-30', weightKg: 72.5 })
  })

  it('updating the profile leaves weigh-ins alone', async () => {
    await completeOnboarding(db, draft, '2026-09-30')
    const edited = { ...draftFromProfile((await db.profile.get(1))!), goal: 'muscle_gain' as const }
    await updateProfile(db, edited)
    expect((await db.profile.get(1))?.goal).toBe('muscle_gain')
    expect(await db.weightLogs.count()).toBe(1)
  })

  it('keeps one weigh-in per day', async () => {
    await logWeight(db, '2026-09-30', 72)
    await logWeight(db, '2026-09-30', 71.8)
    expect(await db.weightLogs.toArray()).toEqual([{ date: '2026-09-30', weightKg: 71.8 }])
  })
})
