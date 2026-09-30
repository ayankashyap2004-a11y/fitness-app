import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveFood } from '../engine/food'
import { searchFoods } from '../engine/search'
import { ensureAppMeta } from './persist'
import { FitnessDB } from './schema'
import { DEFAULT_PINNED_QTY, hashSeed, loadSeed, seedLibrary } from './seed'

const SEED = await loadSeed()

let db: FitnessDB

beforeEach(async () => {
  db = new FitnessDB(`test-${crypto.randomUUID()}`)
  await db.open()
  await ensureAppMeta(db, undefined)
})

afterEach(async () => {
  await db.delete()
})

describe('seed data', () => {
  it('has the counts CLAUDE.md promises', () => {
    expect(SEED.archetypes).toHaveLength(92)
    expect(SEED.dishes).toHaveLength(342)
  })

  it('every dish points at a real archetype', () => {
    const ids = new Set(SEED.archetypes.map((a) => a.id))
    expect(SEED.dishes.filter((d) => !ids.has(d.archetypeId)).map((d) => d.name)).toEqual([])
  })

  it('every alt unit has a positive factor', () => {
    expect(SEED.archetypes.flatMap((a) => a.altUnits).every((u) => u.factor > 0)).toBe(true)
  })
})

describe('seedLibrary', () => {
  it('loads everything on first run', async () => {
    expect(await seedLibrary(db)).toBe(true)
    expect(await db.archetypes.count()).toBe(92)
    expect(await db.foodItems.count()).toBe(342 + SEED.bundled.length)
    expect((await db.appMeta.get(1))?.seedVersion).toBe(hashSeed(SEED))
  })

  it('pins the egg items at the default split', async () => {
    await seedLibrary(db)
    const pinned = await db.pinnedItems.toArray()
    expect(pinned.map((p) => p.foodId).sort()).toEqual(['anda-bhurji', 'boiled-egg'])
    expect(pinned.every((p) => p.defaultQty === DEFAULT_PINNED_QTY && p.slot === 'breakfast')).toBe(true)
  })

  it('skips work when the seed has not changed', async () => {
    await seedLibrary(db)
    expect(await seedLibrary(db)).toBe(false)
  })

  it('keeps user edits, last servings and pin quantities through a re-seed', async () => {
    await seedLibrary(db)
    await db.foodItems.update('sev-tamatar', { userOverride: { kcal: 300 }, lastQty: 1.5, lastUnit: 'katori' })
    const boiled = (await db.pinnedItems.where('foodId').equals('boiled-egg').first())!
    await db.pinnedItems.update(boiled.id!, { defaultQty: 3 })

    const changed = { ...SEED, archetypes: SEED.archetypes.map((a) => (a.id === 'veg_gravy' ? { ...a, name: 'Veg gravy v2' } : a)) }
    expect(await seedLibrary(db, changed)).toBe(true)

    expect(await db.foodItems.get('sev-tamatar')).toMatchObject({ userOverride: { kcal: 300 }, lastQty: 1.5, lastUnit: 'katori' })
    expect((await db.archetypes.get('veg_gravy'))?.name).toBe('Veg gravy v2')
    expect((await db.pinnedItems.get(boiled.id!))?.defaultQty).toBe(3)
    expect(await db.pinnedItems.count()).toBe(2)
  })

  it('applies dish overrides over the archetype', async () => {
    await seedLibrary(db)
    const item = (await db.foodItems.get('sev-tamatar'))!
    const view = resolveFood(item, await db.archetypes.get(item.archetypeId!))!
    expect(view.portion.kcal).toBe(250) // override; veg gravy archetype is 200
  })

  it('finds dishes by alias spelling', async () => {
    await seedLibrary(db)
    const foods = await db.foodItems.toArray()
    expect(searchFoods(foods, 'biriyani').map((f) => f.id)).toContain('chicken-biryani')
    expect(await db.foodItems.where('searchKeys').equals('chicken biriyani').count()).toBe(1)
  })
})
