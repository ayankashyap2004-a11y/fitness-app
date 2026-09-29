import { normalizeName, searchKeysFor, type MealSlot } from '../engine/food'
import { buildNameLookup, slugify } from '../engine/menu'
import type { FitnessDB } from './schema'
import type { FoodItem, Macros } from './types'

export type NewDish = { name: string; slot: MealSlot } & (
  /** Mess-style dish: inherits an archetype's portion, units and macros. */
  | { kind: 'archetype'; archetypeId: string }
  /** Anything else (home food, restaurant, packaged): values for one unit. */
  | { kind: 'custom'; unit: string; perPortion: Macros }
)

/** Id of the dish already using this name or alias, if any. */
export async function findDishByName(db: FitnessDB, name: string): Promise<string | undefined> {
  const key = normalizeName(name)
  if (!key) return undefined
  return (await db.foodItems.where('searchKeys').equals(key).first())?.id
}

/**
 * Adds a dish typed in by hand. If the name (or an alias) already exists, returns that
 * dish instead of creating a duplicate.
 */
export async function createDish(db: FitnessDB, d: NewDish, now = new Date()): Promise<{ id: string; existed: boolean }> {
  const name = d.name.trim().replace(/\s+/g, ' ')
  if (!name) throw new Error('Dish name is required')

  return db.transaction('rw', db.foodItems, async () => {
    const items = await db.foodItems.toArray()
    const existing = buildNameLookup(items).get(normalizeName(name))
    if (existing) return { id: existing, existed: true }

    const id = slugify(name, new Set(items.map((i) => i.id)))
    const base = { id, name, aliases: [], searchKeys: searchKeysFor(name), slots: [d.slot], updatedAt: now.toISOString() }
    const item: FoodItem =
      d.kind === 'archetype'
        ? { ...base, source: 'mess', archetypeId: d.archetypeId, servingUnits: [], timesOnMenu: 0 }
        : { ...base, source: 'personal', perPortion: d.perPortion, defaultUnit: d.unit.trim(), servingUnits: [] }
    await db.foodItems.add(item)
    return { id, existed: false }
  })
}
