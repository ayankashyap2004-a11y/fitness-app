import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveFood, type FoodView } from '../engine/food'
import { OIL_FOOD_ID, addEntry, addMany, addOil, deleteEntry, setUserOverride, updateEntry } from './food'
import { ensureAppMeta } from './persist'
import { FitnessDB } from './schema'
import { seedLibrary } from './seed'

let db: FitnessDB

async function view(id: string): Promise<FoodView> {
  const item = (await db.foodItems.get(id))!
  return resolveFood(item, item.archetypeId ? await db.archetypes.get(item.archetypeId) : undefined)!
}

beforeEach(async () => {
  db = new FitnessDB(`test-${crypto.randomUUID()}`)
  await db.open()
  await ensureAppMeta(db, undefined)
  await seedLibrary(db)
})

afterEach(async () => {
  await db.delete()
})

const day = '2026-09-30'

describe('food log', () => {
  it('logs an entry with computed macros and remembers the serving', async () => {
    const rice = await view('jeera-rice') // flavoured rice: 250 kcal / katori, ladle 0.5
    const id = await addEntry(db, day, 'lunch', rice, { qty: 3, unit: 'ladle' })
    expect((await db.foodLog.get(id))?.macros.kcal).toBe(375)
    expect(await db.foodItems.get('jeera-rice')).toMatchObject({ lastQty: 3, lastUnit: 'ladle' })
  })

  it('edits quantity, unit and slot after saving', async () => {
    const rice = await view('jeera-rice')
    const id = await addEntry(db, day, 'lunch', rice, { qty: 1, unit: rice.units[0]!.unit })
    await updateEntry(db, id, rice, 'dinner', { qty: 1.5, unit: rice.units[0]!.unit })
    expect(await db.foodLog.get(id)).toMatchObject({ mealSlot: 'dinner', qty: 1.5, macros: { kcal: 375 } })
  })

  it('deletes an entry', async () => {
    const rice = await view('jeera-rice')
    const id = await addEntry(db, day, 'lunch', rice, { qty: 1, unit: rice.units[0]!.unit })
    await deleteEntry(db, id)
    expect(await db.foodLog.count()).toBe(0)
  })

  it('+1 tsp oil adds to the slot’s oil entry instead of duplicating', async () => {
    const oil = await view(OIL_FOOD_ID)
    await addOil(db, day, 'lunch', oil)
    await addOil(db, day, 'lunch', oil)
    await addOil(db, day, 'dinner', oil)
    const lunch = await db.foodLog.where({ date: day, mealSlot: 'lunch' }).toArray()
    expect(lunch).toHaveLength(1)
    expect(lunch[0]).toMatchObject({ qty: 2, macros: { kcal: 90, fat: 10 } })
    expect(await db.foodLog.where({ date: day, mealSlot: 'dinner' }).count()).toBe(1)
  })

  it('usual breakfast saves all rows at once and skips zeros', async () => {
    const boiled = await view('boiled-egg')
    const bhurji = await view('anda-bhurji')
    const poha = await view('masala-poha')
    await addMany(db, day, 'breakfast', [
      { food: boiled, serving: { qty: 2, unit: boiled.units[0]!.unit } },
      { food: bhurji, serving: { qty: 2, unit: bhurji.units[0]!.unit } },
      { food: poha, serving: { qty: 0, unit: poha.units[0]!.unit } },
    ])
    const entries = await db.foodLog.where({ date: day, mealSlot: 'breakfast' }).toArray()
    expect(entries.map((e) => e.foodId).sort()).toEqual(['anda-bhurji', 'boiled-egg'])
    expect(entries.reduce((s, e) => s + e.macros.protein, 0)).toBeCloseTo(25.2)
  })

  it('a user edit changes future entries, and can be reset', async () => {
    await setUserOverride(db, 'sev-tamatar', { kcal: 320 })
    expect((await view('sev-tamatar')).portion.kcal).toBe(320)
    await setUserOverride(db, 'sev-tamatar', null)
    expect((await view('sev-tamatar')).portion.kcal).toBe(250)
  })
})
