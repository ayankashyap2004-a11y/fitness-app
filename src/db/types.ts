// Entity types for the on-device database (PRD §6).
// Dates are local ISO strings: 'YYYY-MM-DD' for days, full ISO for timestamps.

import type { MealSlot } from '../engine/food'
import type { OffProduct } from '../engine/off'
import type { DayTemplate, ExerciseDef, LoggedSet, PlannedExercise, TrainingMode } from '../engine/workout'
import type { ActivityLevel, Goal, Intensity, Macros, Sex } from '../engine/types'

export type { ActivityLevel, Goal, Intensity, Macros, MealSlot, Sex, TrainingMode }
export type PhotoAngle = 'front' | 'side' | 'back'
export type CardioType = 'walk' | 'run' | 'cycle' | 'swim' | 'sport' | 'other'
export type FoodSource = 'bundled' | 'personal' | 'off' | 'mess'

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
  /** Mess dishes: appearances on the seed menus, used for ranking. */
  timesOnMenu?: number
  /** Non-mess foods: values checked against a published source. */
  sourced?: boolean
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

export type Exercise = ExerciseDef

export type WorkoutTemplate = DayTemplate

export interface WorkoutSession {
  id?: number
  date: string
  templateDay: number
  dayName: string
  mode: TrainingMode
  startedAt: string
  endedAt?: string
  durationSec?: number
  isDeload: boolean
  completed: boolean
  /** Snapshot of the day's plan at start, so later template edits don't rewrite history. */
  plan: PlannedExercise[]
  /** Per-exercise notes, keyed by plan key. */
  notes?: Record<string, string>
}

export interface CardioLog {
  id?: number
  date: string
  type: CardioType
  durationMin: number
  distanceKm?: number
  note?: string
}

export interface SetLog extends LoggedSet {
  id?: number
  /** Which plan entry this set belongs to within the session. */
  planKey: string
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
  /** Hash of the seed JSON last loaded. */
  seedVersion?: string
  persistRequested: boolean
  persistGranted?: boolean
  firstLaunchAt: string
}

/** Cached Open Food Facts search, so the same search works offline (schema v2). */
export interface OffSearchCache {
  /** Normalised query. */
  query: string
  fetchedAt: string
  products: OffProduct[]
}
