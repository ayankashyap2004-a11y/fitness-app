import { MEAL_SLOTS, searchKeysFor } from '../engine/food'
import { buildNameLookup, normalizeName, slugify, type ParsedMenu, type UnmatchedName } from '../engine/menu'
import type { FitnessDB } from './schema'
import type { FoodItem, MenuDay } from './types'

/** What to do with a menu name that matched nothing. */
export type Resolution =
  /** A spelling of an existing dish: save it as an alias. */
  | { kind: 'alias'; foodId: string }
  /** A genuinely new dish: create it under this archetype. */
  | { kind: 'new'; archetypeId: string }
  /** Leave it out of the menu. */
  | { kind: 'skip' }

export interface ImportSummary {
  days: number
  created: number
  aliased: number
  skipped: number
}

/**
 * Saves a menu import: creates new dishes, records aliases, then replaces the menu
 * rows for every imported date. All-or-nothing.
 */
export async function applyMenuImport(
  db: FitnessDB,
  menu: ParsedMenu,
  unmatched: readonly UnmatchedName[],
  resolutions: ReadonlyMap<string, Resolution>,
  now = new Date(),
): Promise<ImportSummary> {
  const summary: ImportSummary = { days: menu.days.length, created: 0, aliased: 0, skipped: 0 }
  const updatedAt = now.toISOString()

  await db.transaction('rw', db.foodItems, db.menuDays, async () => {
    const taken = new Set((await db.foodItems.toCollection().primaryKeys()) as string[])

    for (const u of unmatched) {
      const r = resolutions.get(u.key) ?? { kind: 'skip' }
      if (r.kind === 'skip') {
        summary.skipped++
      } else if (r.kind === 'alias') {
        const food = await db.foodItems.get(r.foodId)
        if (!food) throw new Error(`Dish ${r.foodId} not found`)
        const aliases = food.aliases.some((a) => normalizeName(a) === u.key) ? food.aliases : [...food.aliases, u.name]
        await db.foodItems.update(food.id, { aliases, searchKeys: searchKeysFor(food.name, aliases), updatedAt })
        summary.aliased++
      } else {
        const id = slugify(u.name, taken)
        taken.add(id)
        const item: FoodItem = {
          id,
          name: u.name,
          aliases: [],
          searchKeys: searchKeysFor(u.name),
          source: 'mess',
          archetypeId: r.archetypeId,
          servingUnits: [],
          slots: u.slots,
          timesOnMenu: 0,
          updatedAt,
        }
        await db.foodItems.add(item)
        summary.created++
      }
    }

    const lookup = buildNameLookup(await db.foodItems.toArray())
    const rows: MenuDay[] = []
    for (const day of menu.days) {
      for (const slot of MEAL_SLOTS) {
        const ids = [
          ...new Set(day.slots[slot].map((n) => lookup.get(normalizeName(n))).filter((id): id is string => !!id)),
        ]
        if (ids.length > 0) rows.push({ date: day.date, slot, foodIds: ids })
      }
    }

    await db.menuDays.where('date').anyOf(menu.days.map((d) => d.date)).delete()
    await db.menuDays.bulkAdd(rows)
  })

  return summary
}
