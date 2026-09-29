import { ageOn } from './dates'
import type { ActivityLevel, Goal, Intensity, Sex } from './types'

/** Form state for onboarding / settings. Numbers stay as typed strings until saved. */
export interface ProfileDraft {
  name: string
  sex: Sex | ''
  dob: string
  heightCm: string
  weightKg: string
  activityLevel: ActivityLevel | ''
  goal: Goal | ''
  intensity: Intensity
}

export type ProfileField = keyof ProfileDraft
export type ProfileErrors = Partial<Record<ProfileField, string>>

export const LIMITS = {
  age: [13, 100],
  heightCm: [100, 250],
  weightKg: [30, 300],
} as const

/** Accepts '72.5' or '72,5'. Returns NaN for anything else. */
export function parseDecimal(s: string): number {
  const t = s.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN
}

export function validateProfile(
  d: ProfileDraft,
  today: string,
  fields: readonly ProfileField[] = ['name', 'sex', 'dob', 'heightCm', 'weightKg', 'activityLevel', 'goal'],
): ProfileErrors {
  const errors: ProfileErrors = {}
  const check = (field: ProfileField, msg: string | null) => {
    if (fields.includes(field) && msg) errors[field] = msg
  }

  check('name', d.name.trim() ? null : 'Enter your name')
  check('sex', d.sex ? null : 'Pick one')

  let dobMsg: string | null = null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dob)) dobMsg = 'Enter your date of birth'
  else {
    const age = ageOn(d.dob, today)
    if (age < LIMITS.age[0] || age > LIMITS.age[1]) dobMsg = `Age must be ${LIMITS.age[0]}–${LIMITS.age[1]}`
  }
  check('dob', dobMsg)

  const inRange = (s: string, [lo, hi]: readonly [number, number], unit: string) => {
    const n = parseDecimal(s)
    if (Number.isNaN(n)) return 'Enter a number'
    return n < lo || n > hi ? `Must be ${lo}–${hi} ${unit}` : null
  }
  check('heightCm', inRange(d.heightCm, LIMITS.heightCm, 'cm'))
  check('weightKg', inRange(d.weightKg, LIMITS.weightKg, 'kg'))
  check('activityLevel', d.activityLevel ? null : 'Pick one')
  check('goal', d.goal ? null : 'Pick one')

  return errors
}
