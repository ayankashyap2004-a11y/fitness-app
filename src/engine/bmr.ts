import type { Sex } from './types'

export interface BmrInput {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
}

/** Mifflin-St Jeor (PRD §4.2 step 1), kcal/day. */
export function bmr({ sex, weightKg, heightCm, age }: BmrInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}
