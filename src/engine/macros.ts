import type { Goal } from './types'

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const

/** Protein g/kg bodyweight by goal (PRD §4.2 step 3). */
export const PROTEIN_G_PER_KG: Record<Goal, number> = {
  fat_loss: 2.2,
  muscle_gain: 1.8,
  recomp: 2.0,
}

export const FAT_SHARE = 0.25
export const FAT_G_PER_KG_MIN = 0.6
export const FAT_G_PER_KG_MAX = 1.5
export const MIN_CARBS_G_PER_KG_GAIN = 3

export interface MacroSplit {
  protein: number
  fat: number
  carbs: number
  /** Muscle gain only: carbs fell below 3 g/kg. */
  lowCarbs: boolean
}

/** PRD §4.2 step 4. Unrounded grams. */
export function splitMacros(kcal: number, weightKg: number, goal: Goal): MacroSplit {
  const protein = PROTEIN_G_PER_KG[goal] * weightKg
  const fatFromShare = (kcal * FAT_SHARE) / KCAL_PER_G.fat
  const fat = Math.min(Math.max(fatFromShare, FAT_G_PER_KG_MIN * weightKg), FAT_G_PER_KG_MAX * weightKg)
  const remaining = kcal - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat
  const carbs = Math.max(0, remaining / KCAL_PER_G.carbs)
  const lowCarbs = goal === 'muscle_gain' && carbs < MIN_CARBS_G_PER_KG_GAIN * weightKg
  return { protein, fat, carbs, lowCarbs }
}
