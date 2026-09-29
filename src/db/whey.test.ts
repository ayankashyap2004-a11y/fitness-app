import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { entryMacros, resolveFood } from '../engine/food'
import { searchFoods } from '../engine/search'
import { ensureAppMeta } from './persist'
import { FitnessDB } from './schema'
import { seedLibrary } from './seed'
import { WHEY_ID, saveWhey, unpinWhey } from './whey'

let db: FitnessDB

beforeEach(async () => {
  db = new FitnessDB(`test-${crypto.randomUUID()}`)
  await db.open()
  await ensureAppMeta(db, undefined)
  await seedLibrary(db)
})

afterEach(async () => {
  await db.delete()
})

const label = { name: 'MuscleBlaze Biozyme', scoopGrams: 33, perScoop: { kcal: 130, protein: 25, carbs: 3.5, fat: 1.8 } }

describe('whey', () => {
  it('saves per-scoop values from the tub label', async () => {
    await saveWhey(db, label)
    const view = resolveFood((await db.foodItems.get(WHEY_ID))!)!
    expect(view.name).toBe('MuscleBlaze Biozyme')
    expect(view.units[0]).toMatchObject({ label: 'scoop', detail: '33 g' })
    expect(entryMacros(view.portion, view.units, view.units[0]!.unit, 1)).toEqual(label.perScoop)
    expect(searchFoods([view], 'whey')).toHaveLength(1)
  })

  it('pins it to every slot once, at 1 scoop', async () => {
    await saveWhey(db, label)
    await saveWhey(db, { ...label, perScoop: { ...label.perScoop, protein: 24 } })
    const pins = await db.pinnedItems.where('foodId').equals(WHEY_ID).toArray()
    expect(pins).toEqual([expect.objectContaining({ slot: 'any', defaultQty: 1 })])
    expect((await db.foodItems.get(WHEY_ID))?.perPortion?.protein).toBe(24)
  })

  it('keeps the egg pins alongside', async () => {
    await saveWhey(db, label)
    expect(await db.pinnedItems.count()).toBe(3)
  })

  it('unpinning keeps the food for history', async () => {
    await saveWhey(db, label)
    await unpinWhey(db)
    expect(await db.pinnedItems.where('foodId').equals(WHEY_ID).count()).toBe(0)
    expect(await db.foodItems.get(WHEY_ID)).toBeDefined()
  })

  it('defaults a blank name', async () => {
    await saveWhey(db, { name: '  ', perScoop: label.perScoop })
    expect((await db.foodItems.get(WHEY_ID))?.name).toBe('Whey protein')
  })
})
