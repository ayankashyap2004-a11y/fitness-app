import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveFood } from '../engine/food'
import { searchFoods } from '../engine/search'
import { OffError, offFoodId, saveOffProduct, searchOff, type Fetcher } from './off'
import { ensureAppMeta } from './persist'
import { FitnessDB } from './schema'

let db: FitnessDB

beforeEach(async () => {
  db = new FitnessDB(`test-${crypto.randomUUID()}`)
  await db.open()
  await ensureAppMeta(db, undefined)
})

afterEach(async () => {
  await db.delete()
})

const BAR = {
  code: '8906000000001',
  product_name: 'Protein Bar Almond Fudge',
  brands: 'Yoga Bar',
  serving_size: '1 bar (60 g)',
  serving_quantity: 60,
  nutriments: { 'energy-kcal_100g': 400, proteins_100g: 33.3, carbohydrates_100g: 40, fat_100g: 12 },
}

const primaryHit: Fetcher = async (url) => (url.includes('search.openfoodfacts.org') ? { hits: [BAR], count: 1 } : { products: [] })

describe('searchOff', () => {
  it('searches, parses and caches by normalised query', async () => {
    const r = await searchOff(db, '  Yoga  BAR ', primaryHit, true)
    expect(r.fromCache).toBe(false)
    expect(r.products.map((p) => p.barcode)).toEqual(['8906000000001'])
    expect((await db.offSearches.get('yoga bar'))?.products).toHaveLength(1)
  })

  it('falls back to the legacy API when the primary fails', async () => {
    const fetcher = vi.fn<Fetcher>(async (url) => {
      if (url.includes('search.openfoodfacts.org')) throw new Error('503')
      return { products: [BAR] }
    })
    const r = await searchOff(db, 'yoga bar', fetcher, true)
    expect(r.products).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('falls back to the legacy API when the primary finds nothing', async () => {
    const r = await searchOff(db, 'yoga bar', async (url) => (url.includes('cgi/search.pl') ? { products: [BAR] } : { hits: [] }), true)
    expect(r.products).toHaveLength(1)
  })

  it('uses the cache when offline', async () => {
    await searchOff(db, 'yoga bar', primaryHit, true)
    const never = vi.fn<Fetcher>()
    const r = await searchOff(db, 'YOGA BAR', never, false)
    expect(r.fromCache).toBe(true)
    expect(r.products).toHaveLength(1)
    expect(never).not.toHaveBeenCalled()
  })

  it('uses the cache when both APIs fail', async () => {
    await searchOff(db, 'yoga bar', primaryHit, true)
    const r = await searchOff(db, 'yoga bar', async () => { throw new Error('down') }, true)
    expect(r.fromCache).toBe(true)
  })

  it('explains offline and failure when nothing is cached', async () => {
    await expect(searchOff(db, 'new thing', primaryHit, false)).rejects.toMatchObject({ kind: 'offline' })
    await expect(searchOff(db, 'new thing', async () => { throw new Error('down') }, true)).rejects.toBeInstanceOf(OffError)
  })

  it('caches an empty result too, so it is not re-fetched offline', async () => {
    const r = await searchOff(db, 'nothing matches', async () => ({ hits: [] }), true)
    expect(r.products).toEqual([])
    expect(await db.offSearches.get('nothing matches')).toBeDefined()
  })
})

describe('saveOffProduct', () => {
  it('adds the product to the library as a loggable, searchable food', async () => {
    const [bar] = (await searchOff(db, 'yoga bar', primaryHit, true)).products
    const id = await saveOffProduct(db, bar!)
    expect(id).toBe(offFoodId('8906000000001'))
    const item = (await db.foodItems.get(id))!
    expect(item).toMatchObject({ name: 'Yoga Bar Protein Bar Almond Fudge', source: 'off', offBarcode: '8906000000001' })
    const view = resolveFood(item)!
    expect(view.units.map((u) => u.label)).toEqual(['bar', '100 g', 'g'])
    expect(view.portion).toEqual({ kcal: 240, protein: 20, carbs: 24, fat: 7.2 })
    expect(searchFoods([view], 'almond fudge')).toHaveLength(1)
  })

  it('keeps the user’s edits and last serving when saved again', async () => {
    const [bar] = (await searchOff(db, 'yoga bar', primaryHit, true)).products
    const id = await saveOffProduct(db, bar!)
    await db.foodItems.update(id, { userOverride: { kcal: 230 }, lastQty: 0.5, lastUnit: 'bar (60 g)' })
    await saveOffProduct(db, bar!)
    expect(await db.foodItems.get(id)).toMatchObject({ userOverride: { kcal: 230 }, lastQty: 0.5 })
  })
})

describe('schema upgrade', () => {
  it('v1 data survives the move to v2', async () => {
    const name = `upgrade-${crypto.randomUUID()}`
    const v1 = new Dexie(name)
    v1.version(1).stores({ weightLogs: 'date', foodLog: '++id, date, [date+mealSlot], foodId' })
    await v1.open()
    await v1.table('weightLogs').put({ date: '2026-09-30', weightKg: 68 })
    v1.close()

    const v2 = new FitnessDB(name)
    await v2.open()
    expect(await v2.weightLogs.get('2026-09-30')).toEqual({ date: '2026-09-30', weightKg: 68 })
    expect(await v2.offSearches.count()).toBe(0)
    await v2.delete()
  })
})
