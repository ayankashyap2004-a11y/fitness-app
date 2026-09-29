import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveFood } from '../engine/food'
import { createDish, findDishByName } from './dishes'
import { ensureAppMeta } from './persist'
import { FitnessDB } from './schema'
import { seedLibrary } from './seed'

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

describe('createDish', () => {
  it('creates a mess-style dish that inherits its archetype', async () => {
    const r = await createDish(db, { name: '  Chicken  Tikka Masala ', slot: 'dinner', kind: 'archetype', archetypeId: 'chicken_curry' })
    expect(r).toEqual({ id: 'chicken-tikka-masala', existed: false })
    const item = (await db.foodItems.get(r.id))!
    expect(item).toMatchObject({ name: 'Chicken Tikka Masala', source: 'mess', slots: ['dinner'] })
    const view = resolveFood(item, await db.archetypes.get('chicken_curry'))!
    expect(view.portion.kcal).toBe(250)
    expect(view.units.map((u) => u.label)).toEqual(['katori', 'piece'])
  })

  it('creates a dish with its own values per unit', async () => {
    const r = await createDish(db, {
      name: "Mom's Rajma",
      slot: 'lunch',
      kind: 'custom',
      unit: 'bowl',
      perPortion: { kcal: 320, protein: 14, carbs: 45, fat: 9 },
    })
    const view = resolveFood((await db.foodItems.get(r.id))!)!
    expect(view.source).toBe('personal')
    expect(view.portion).toEqual({ kcal: 320, protein: 14, carbs: 45, fat: 9 })
    expect(view.units.map((u) => u.unit)).toEqual(['bowl'])
  })

  it('returns the existing dish instead of a duplicate, matching aliases and case', async () => {
    expect(await createDish(db, { name: 'DAL TADKA', slot: 'lunch', kind: 'archetype', archetypeId: 'thin_dal' })).toEqual({
      id: 'dal-tadka',
      existed: true,
    })
    expect(await createDish(db, { name: 'chicken biriyani', slot: 'dinner', kind: 'archetype', archetypeId: 'chicken_biryani' })).toEqual({
      id: 'chicken-biryani',
      existed: true,
    })
  })

  it('makes the new dish findable by name', async () => {
    await createDish(db, { name: 'Dragon Paneer', slot: 'dinner', kind: 'archetype', archetypeId: 'paneer_dish' })
    expect(await findDishByName(db, 'dragon paneer')).toBe('dragon-paneer')
  })

  it('picks a free id when the slug is taken by a different name', async () => {
    // 'Roti!' normalises to 'roti!' (a new name) but slugs to 'roti', which the seed uses.
    const r = await createDish(db, { name: 'Roti!', slot: 'lunch', kind: 'archetype', archetypeId: 'roti' })
    expect(r).toEqual({ id: 'roti-2', existed: false })
  })

  it('rejects an empty name', async () => {
    await expect(createDish(db, { name: '  ', slot: 'lunch', kind: 'archetype', archetypeId: 'roti' })).rejects.toThrow()
  })
})
