import archetypesJson from '../data/archetypes.json'
import bundledJson from '../data/bundled-foods.json'
import dishesJson from '../data/mess-dishes.json'
import exercisesJson from '../data/exercises.json'
import splitJson from '../data/split.json'
import { searchKeysFor } from '../engine/food'
import type { FitnessDB } from './schema'
import type { AltUnit, Archetype, Exercise, FoodItem, Macros, MealSlot, WorkoutTemplate } from './types'

interface SeedDish {
  id: string
  name: string
  aliases: string[]
  archetypeId: string
  slots: string[]
  timesOnMenu: number
  override?: Partial<Macros>
  pinned?: boolean
}

interface SeedBundled {
  id: string
  name: string
  aliases: string[]
  defaultUnit: string
  perPortion: Macros
  servingUnits: AltUnit[]
  sourced: boolean
}

export interface SeedData {
  archetypes: Archetype[]
  dishes: SeedDish[]
  bundled: SeedBundled[]
  exercises: Exercise[]
  split: WorkoutTemplate[]
}

export const SEED: SeedData = {
  archetypes: archetypesJson as Archetype[],
  dishes: dishesJson as SeedDish[],
  bundled: bundledJson as SeedBundled[],
  exercises: exercisesJson as Exercise[],
  split: splitJson as WorkoutTemplate[],
}

/** Default eggs for pinned breakfast items (2 boiled + 2-egg bhurji). Editable in Settings. */
export const DEFAULT_PINNED_QTY = 2

/** FNV-1a, enough to notice that the seed JSON changed. */
export function hashSeed(data: SeedData): string {
  const s = JSON.stringify(data)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

/** Fields the user owns; a re-seed must never overwrite them. */
const USER_FIELDS = ['userOverride', 'lastQty', 'lastUnit'] as const

/**
 * Loads archetypes, mess dishes, bundled foods, exercises and the split on first run, and again whenever the
 * seed JSON changes. User edits and last-used quantities survive a re-seed.
 */
export async function seedLibrary(db: FitnessDB, data: SeedData = SEED, now = new Date()): Promise<boolean> {
  const version = hashSeed(data)
  const meta = await db.appMeta.get(1)
  if (meta?.seedVersion === version) return false

  const updatedAt = now.toISOString()
  const fresh: FoodItem[] = [
    ...data.dishes.map(
      (d): FoodItem => ({
        id: d.id,
        name: d.name,
        aliases: d.aliases,
        searchKeys: searchKeysFor(d.name, d.aliases),
        source: 'mess',
        archetypeId: d.archetypeId,
        override: d.override,
        servingUnits: [],
        slots: d.slots as MealSlot[],
        timesOnMenu: d.timesOnMenu,
        updatedAt,
      }),
    ),
    ...data.bundled.map(
      (b): FoodItem => ({
        id: b.id,
        name: b.name,
        aliases: b.aliases,
        searchKeys: searchKeysFor(b.name, b.aliases),
        source: 'bundled',
        perPortion: b.perPortion,
        defaultUnit: b.defaultUnit,
        servingUnits: b.servingUnits,
        sourced: b.sourced,
        updatedAt,
      }),
    ),
  ]

  await db.transaction('rw', [db.archetypes, db.foodItems, db.pinnedItems, db.exercises, db.workoutTemplates, db.appMeta], async () => {
    await db.archetypes.bulkPut(data.archetypes)
    await db.exercises.bulkPut(data.exercises)
    // The split is the user's to edit: only seed it once. 'Reset day' restores from SEED.
    if ((await db.workoutTemplates.count()) === 0) await db.workoutTemplates.bulkPut(data.split)

    const existing = await db.foodItems.bulkGet(fresh.map((f) => f.id))
    const merged = fresh.map((f, i) => {
      const old = existing[i]
      if (!old) return f
      const kept: Partial<FoodItem> = {}
      for (const k of USER_FIELDS) if (old[k] !== undefined) Object.assign(kept, { [k]: old[k] })
      return { ...f, ...kept }
    })
    await db.foodItems.bulkPut(merged)

    if ((await db.pinnedItems.count()) === 0) {
      await db.pinnedItems.bulkAdd(
        data.dishes
          .filter((d) => d.pinned)
          .map((d) => ({ slot: 'breakfast' as const, foodId: d.id, defaultQty: DEFAULT_PINNED_QTY })),
      )
    }

    await db.appMeta.update(1, { seedVersion: version })
  })
  return true
}
