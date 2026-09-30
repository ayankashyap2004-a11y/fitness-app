import { parseDecimal, type ProfileDraft } from '../engine/profile'
import type { FitnessDB } from './schema'
import type { Profile } from './types'

export function draftFromProfile(p: Profile): ProfileDraft {
  return {
    name: p.name,
    sex: p.sex,
    dob: p.dob,
    heightCm: String(p.heightCm),
    weightKg: '',
    activityLevel: p.activityLevel,
    goal: p.goal,
    intensity: p.intensity,
  }
}

/** Call only with a draft that passed validateProfile. */
function toProfile(d: ProfileDraft): Profile {
  if (!d.sex || !d.activityLevel || !d.goal) throw new Error('Incomplete profile')
  return {
    id: 1,
    name: d.name.trim(),
    sex: d.sex,
    dob: d.dob,
    heightCm: parseDecimal(d.heightCm),
    activityLevel: d.activityLevel,
    goal: d.goal,
    intensity: d.intensity,
  }
}

/** Onboarding: saves the profile and the first weigh-in together. */
export async function completeOnboarding(db: FitnessDB, d: ProfileDraft, today: string) {
  await db.transaction('rw', db.profile, db.weightLogs, async () => {
    await db.profile.put(toProfile(d))
    await db.weightLogs.put({ date: today, weightKg: parseDecimal(d.weightKg) })
  })
}

/** Settings: profile fields only; bodyweight comes from weigh-ins. */
export async function updateProfile(db: FitnessDB, d: ProfileDraft) {
  await db.profile.put(toProfile(d))
}

/** One weigh-in per day; logging again replaces it. */
export async function logWeight(db: FitnessDB, date: string, weightKg: number) {
  await db.weightLogs.put({ date, weightKg })
}

export async function deleteWeight(db: FitnessDB, date: string) {
  await db.weightLogs.delete(date)
}
