import type { ActivityLevel } from './types'

/** PRD §4.1. Already includes planned training; never add workout calories on top. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
}

export function tdee(bmrKcal: number, level: ActivityLevel): number {
  return bmrKcal * ACTIVITY_FACTORS[level]
}
