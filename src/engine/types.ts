export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very'
export type Goal = 'fat_loss' | 'muscle_gain' | 'recomp'
export type Intensity = 'mild' | 'moderate' | 'aggressive'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}
