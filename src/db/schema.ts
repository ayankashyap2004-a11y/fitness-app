import Dexie, { type EntityTable } from 'dexie'
import type {
  AppMeta,
  Archetype,
  CardioLog,
  Exercise,
  FoodItem,
  FoodLogEntry,
  MenuDay,
  OffSearchCache,
  PinnedItem,
  Profile,
  ProgressPhoto,
  SavedMeal,
  SetLog,
  WeightLog,
  WorkoutSession,
  WorkoutTemplate,
} from './types'

export class FitnessDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  weightLogs!: EntityTable<WeightLog, 'date'>
  archetypes!: EntityTable<Archetype, 'id'>
  foodItems!: EntityTable<FoodItem, 'id'>
  menuDays!: EntityTable<MenuDay, 'id'>
  pinnedItems!: EntityTable<PinnedItem, 'id'>
  savedMeals!: EntityTable<SavedMeal, 'id'>
  foodLog!: EntityTable<FoodLogEntry, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workoutTemplates!: EntityTable<WorkoutTemplate, 'dayIndex'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  cardioLogs!: EntityTable<CardioLog, 'id'>
  setLogs!: EntityTable<SetLog, 'id'>
  progressPhotos!: EntityTable<ProgressPhoto, 'id'>
  appMeta!: EntityTable<AppMeta, 'id'>
  offSearches!: EntityTable<OffSearchCache, 'query'>

  constructor(name = 'fitness') {
    super(name)
    // Only indexed fields are listed. Add migrations as new versions; never edit a shipped one.
    this.version(1).stores({
      profile: 'id',
      weightLogs: 'date',
      archetypes: 'id, group',
      foodItems: 'id, source, archetypeId, *searchKeys, offBarcode',
      menuDays: '++id, &[date+slot], date',
      pinnedItems: '++id, slot, foodId',
      savedMeals: '++id, name',
      foodLog: '++id, date, [date+mealSlot], foodId',
      exercises: 'id, equipment, swapId',
      workoutTemplates: 'dayIndex',
      workoutSessions: '++id, date, templateDay',
      cardioLogs: '++id, date',
      setLogs: '++id, sessionId, exerciseId, [exerciseId+sessionId]',
      progressPhotos: '++id, date, [date+angle]',
      appMeta: 'id',
    })
    // v2 (Phase 5): Open Food Facts search cache.
    this.version(2).stores({
      offSearches: 'query, fetchedAt',
    })
  }
}

export const db = new FitnessDB()
