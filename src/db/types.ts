// Entity types for the on-device database (PRD §6).
// Dates are local ISO strings: 'YYYY-MM-DD' for days, full ISO for timestamps.

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very'
export type Goal = 'fat_loss' | 'muscle_gain' | 'recomp'
export type Intensity = 'mild' | 'moderate' | 'aggressive'
export type MealSlot = 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'dessert'
export type TrainingMode = 'gym' | 'home'
export type PhotoAngle = 'front' | 'side' | 'back'
export type CardioType = 'walk' | 'run' | 'cycle' | 'swim' | 'sport' | 'other'
export type FoodSource = 'bundled' | 'personal' | 'off' | 'mess'

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface AltUnit {
  unit: string
  /** Multiplier on the default portion (e.g. ladle = 0.5 katori). */
  factor: number
}

/** Singleton row, id is always 1. */
export interface Profile {
  id: 1
  name: string
  sex: Sex
  dob: string
  heightCm: number
  activityLevel: ActivityLevel
  goal: Goal
  /** Ignored for recomp. */
  intensity: Intensity
}

export interface WeightLog {
  date: string
  weightKg: number
}

export interface Archetype {
  id: string
  name: string
  group: string
  defaultUnit: string
  perPortion: Macros
  defaultOilTsp: number
  sourced: boolean
  altUnits: AltUnit[]
}

export interface FoodItem {
  id: string
  name: string
  /** Lowercased name + aliases, for case-insensitive matching (multiEntry index). */
  searchKeys: string[]
  aliases: string[]
  source: FoodSource
  /** Mess dishes inherit macros from their archetype. */
  archetypeId?: string
  /** Dish-level override from seed data; beats the archetype. */
  override?: Partial<Macros>
  /** User edit; beats both override and archetype. */
  userOverride?: Partial<Macros>
  /** Non-mess foods: macros for one default unit. */
  perPortion?: Macros
  defaultUnit?: string
  servingUnits: AltUnit[]
  slots?: MealSlot[]
  offBarcode?: string
  lastQty?: number
  lastUnit?: string
  updatedAt: string
}

export interface MenuDay {
  id?: number
  date: string
  slot: MealSlot
  foodIds: string[]
}

export interface PinnedItem {
  id?: number
  slot: MealSlot | 'any'
  foodId: string
  defaultQty: number
  unit?: string
}

export interface SavedMeal {
  id?: number
  name: string
  items: { foodId: string; qty: number; unit: string }[]
}

export interface FoodLogEntry {
  id?: number
  date: string
  mealSlot: MealSlot
  foodId: string
  qty: number
  unit: string
  /** Snapshot at log time so history stays stable if library values change. */
  macros: Macros
  createdAt: string
}

export interface Exercise {
  id: string
  name: string
  muscles: { primary: string[]; secondary: string[] }
  equipment: TrainingMode
  howTo: string[]
  cues: string[]
  mistakes: string[]
  /** Gym ↔ home counterpart. */
  swapId?: string
}

export interface TemplateExercise {
  exerciseId: string
  sets: number
  repRange: [number, number]
  rir: string
  restSec: number
}

export interface WorkoutTemplate {
  dayIndex: number
  name: string
  exercises: TemplateExercise[]
}

export interface WorkoutSession {
  id?: number
  date: string
  templateDay: number
  mode: TrainingMode
  startedAt: string
  durationSec?: number
  isDeload: boolean
  completed: boolean
}

export interface CardioLog {
  id?: number
  date: string
  type: CardioType
  durationMin: number
  distanceKm?: number
  note?: string
}

export interface SetLog {
  id?: number
  sessionId: number
  exerciseId: string
  setNo: number
  weightKg: number
  reps: number
  rir?: 0 | 1 | 2 | 3
  note?: string
  loggedAt: string
}

export interface ProgressPhoto {
  id?: number
  date: string
  angle: PhotoAngle
  blob: Blob
}

/** Singleton row, id is always 1. */
export interface AppMeta {
  id: 1
  lastBackupDate?: string
  /** Next dayIndex in the split rotation. */
  splitPointer: number
  weeksSinceDeload: number
  deloadSkips: number
  seedVersion?: number
  persistRequested: boolean
  persistGranted?: boolean
  firstLaunchAt: string
}
