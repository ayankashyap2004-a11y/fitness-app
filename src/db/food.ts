import { entryMacros, type FoodView } from '../engine/food'
import type { FitnessDB } from './schema'
import type { FoodLogEntry, Macros, MealSlot } from './types'

export const OIL_FOOD_ID = 'extra-oil'

export interface Serving {
  qty: number
  unit: string
}

function buildEntry(date: string, mealSlot: MealSlot, food: FoodView, s: Serving): FoodLogEntry {
  return {
    date,
    mealSlot,
    foodId: food.id,
    qty: s.qty,
    unit: s.unit,
    macros: entryMacros(food.portion, food.units, s.unit, s.qty),
    createdAt: new Date().toISOString(),
  }
}

async function rememberServing(db: FitnessDB, foodId: string, s: Serving) {
  await db.foodItems.update(foodId, { lastQty: s.qty, lastUnit: s.unit })
}

export async function addEntry(db: FitnessDB, date: string, mealSlot: MealSlot, food: FoodView, s: Serving): Promise<number> {
  return db.transaction('rw', db.foodLog, db.foodItems, async () => {
    // Auto-increment key, so add() always yields a number.
    const id = (await db.foodLog.add(buildEntry(date, mealSlot, food, s))) as number
    await rememberServing(db, food.id, s)
    return id
  })
}

/** Quantities stay editable after saving; macros are recomputed from current values. */
export async function updateEntry(db: FitnessDB, id: number, food: FoodView, mealSlot: MealSlot, s: Serving) {
  await db.transaction('rw', db.foodLog, db.foodItems, async () => {
    await db.foodLog.update(id, {
      mealSlot,
      qty: s.qty,
      unit: s.unit,
      macros: entryMacros(food.portion, food.units, s.unit, s.qty),
    })
    await rememberServing(db, food.id, s)
  })
}

export async function deleteEntry(db: FitnessDB, id: number) {
  await db.foodLog.delete(id)
}

/** '+1 tsp oil': bumps the slot's oil entry, or starts one. */
export async function addOil(db: FitnessDB, date: string, mealSlot: MealSlot, oil: FoodView) {
  await db.transaction('rw', db.foodLog, async () => {
    const existing = await db.foodLog
      .where({ date, mealSlot })
      .filter((e) => e.foodId === OIL_FOOD_ID && e.unit === oil.units[0]!.unit)
      .first()
    if (existing?.id !== undefined) {
      const qty = existing.qty + 1
      await db.foodLog.update(existing.id, { qty, macros: entryMacros(oil.portion, oil.units, existing.unit, qty) })
    } else {
      await db.foodLog.add(buildEntry(date, mealSlot, oil, { qty: 1, unit: oil.units[0]!.unit }))
    }
  })
}

/** Usual breakfast: saves every row with qty > 0 at once. */
export async function addMany(db: FitnessDB, date: string, mealSlot: MealSlot, rows: { food: FoodView; serving: Serving }[]) {
  const kept = rows.filter((r) => r.serving.qty > 0)
  await db.transaction('rw', db.foodLog, db.foodItems, async () => {
    await db.foodLog.bulkAdd(kept.map((r) => buildEntry(date, mealSlot, r.food, r.serving)))
    for (const r of kept) await rememberServing(db, r.food.id, r.serving)
  })
}

/** Per-dish edit that beats the dish override and archetype. Pass null to reset. */
export async function setUserOverride(db: FitnessDB, foodId: string, macros: Partial<Macros> | null) {
  await db.foodItems.update(foodId, { userOverride: macros ?? undefined, updatedAt: new Date().toISOString() })
}

export async function setPinnedQty(db: FitnessDB, pinnedId: number, defaultQty: number) {
  await db.pinnedItems.update(pinnedId, { defaultQty })
}
