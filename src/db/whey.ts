import { searchKeysFor } from '../engine/food'
import type { FitnessDB } from './schema'
import type { FoodItem, Macros } from './types'

export const WHEY_ID = 'whey'

export interface WheyInput {
  /** As on the tub, e.g. 'MuscleBlaze Biozyme'. */
  name: string
  scoopGrams?: number
  perScoop: Macros
}

/**
 * Saves whey from the tub label (brands vary, so values are entered once) and pins it
 * to every meal slot with 1 scoop as the default.
 */
export async function saveWhey(db: FitnessDB, w: WheyInput, now = new Date()) {
  const name = w.name.trim() || 'Whey protein'
  await db.transaction('rw', db.foodItems, db.pinnedItems, async () => {
    const old = await db.foodItems.get(WHEY_ID)
    const item: FoodItem = {
      id: WHEY_ID,
      name,
      aliases: ['Whey', 'Protein shake'],
      searchKeys: searchKeysFor(name, ['Whey', 'Protein shake']),
      source: 'personal',
      perPortion: w.perScoop,
      defaultUnit: w.scoopGrams ? `scoop (${w.scoopGrams} g)` : 'scoop',
      servingUnits: [],
      sourced: true,
      updatedAt: now.toISOString(),
      lastQty: old?.lastQty,
      lastUnit: old?.lastUnit,
    }
    await db.foodItems.put(item)
    if ((await db.pinnedItems.where('foodId').equals(WHEY_ID).count()) === 0) {
      await db.pinnedItems.add({ slot: 'any', foodId: WHEY_ID, defaultQty: 1 })
    }
  })
}

/** Stops showing whey as pinned. The dish and past entries stay. */
export async function unpinWhey(db: FitnessDB) {
  await db.pinnedItems.where('foodId').equals(WHEY_ID).delete()
}
