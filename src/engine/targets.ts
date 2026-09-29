import { ageOn } from './dates'
import { bmr } from './bmr'
import { splitMacros } from './macros'
import { tdee } from './tdee'
import type { ActivityLevel, Goal, Intensity, Macros, Sex } from './types'

/** Fixed deficits for fat loss (kcal). */
export const FAT_LOSS_DEFICIT: Record<Intensity, number> = { mild: 250, moderate: 500, aggressive: 750 }
/** Surplus multipliers for muscle gain. */
export const MUSCLE_GAIN_FACTOR: Record<Intensity, number> = { mild: 1.05, moderate: 1.1, aggressive: 1.15 }

/** PRD §4.2 step 3, before the BMR floor. Intensity is ignored for recomp. */
export function goalCalories(tdeeKcal: number, goal: Goal, intensity: Intensity): number {
  switch (goal) {
    case 'fat_loss':
      return tdeeKcal - FAT_LOSS_DEFICIT[intensity]
    case 'muscle_gain':
      return tdeeKcal * MUSCLE_GAIN_FACTOR[intensity]
    case 'recomp':
      return tdeeKcal
  }
}

export interface TargetInput {
  sex: Sex
  dob: string
  heightCm: number
  activityLevel: ActivityLevel
  goal: Goal
  intensity: Intensity
  /** Use the 7-day average bodyweight, not the latest weigh-in. */
  weightKg: number
  /** 'YYYY-MM-DD' */
  today: string
}

export interface Targets extends Macros {
  age: number
  bmr: number
  tdee: number
  weightKg: number
  notes: {
    /** Goal math went below BMR, so the target was raised to BMR. */
    flooredToBmr: boolean
    /** Fat loss at −750 kcal: higher risk of muscle loss. */
    aggressiveDeficit: boolean
    /** Muscle gain with carbs below 3 g/kg. */
    lowCarbs: boolean
  }
}

/** Full pipeline: BMR → TDEE → goal adjustment → BMR floor → macro split. Outputs rounded to whole numbers. */
export function computeTargets(input: TargetInput): Targets {
  const age = ageOn(input.dob, input.today)
  const bmrKcal = bmr({ sex: input.sex, weightKg: input.weightKg, heightCm: input.heightCm, age })
  const tdeeKcal = tdee(bmrKcal, input.activityLevel)
  const raw = goalCalories(tdeeKcal, input.goal, input.intensity)
  const flooredToBmr = raw < bmrKcal
  const kcal = flooredToBmr ? bmrKcal : raw
  const split = splitMacros(kcal, input.weightKg, input.goal)

  return {
    age,
    bmr: Math.round(bmrKcal),
    tdee: Math.round(tdeeKcal),
    weightKg: input.weightKg,
    kcal: Math.round(kcal),
    protein: Math.round(split.protein),
    carbs: Math.round(split.carbs),
    fat: Math.round(split.fat),
    notes: {
      flooredToBmr,
      aggressiveDeficit: input.goal === 'fat_loss' && input.intensity === 'aggressive',
      lowCarbs: split.lowCarbs,
    },
  }
}
