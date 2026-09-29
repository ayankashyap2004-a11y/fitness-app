import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FitnessDB } from './schema'
import { ensureAppMeta } from './persist'

let db: FitnessDB

beforeEach(async () => {
  db = new FitnessDB(`test-${crypto.randomUUID()}`)
  await db.open()
})

afterEach(async () => {
  await db.delete()
})

describe('FitnessDB schema', () => {
  it('opens with every PRD §6 table', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      [
        'appMeta',
        'archetypes',
        'cardioLogs',
        'exercises',
        'foodItems',
        'foodLog',
        'menuDays',
        'offSearches',
        'pinnedItems',
        'profile',
        'progressPhotos',
        'savedMeals',
        'setLogs',
        'weightLogs',
        'workoutSessions',
        'workoutTemplates',
      ].sort(),
    )
  })

  it('queries food log entries by date and slot', async () => {
    const macros = { kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3 }
    const createdAt = new Date().toISOString()
    await db.foodLog.bulkAdd([
      { date: '2026-09-30', mealSlot: 'breakfast', foodId: 'boiled-egg', qty: 2, unit: 'piece', macros, createdAt },
      { date: '2026-09-30', mealSlot: 'dinner', foodId: 'roti', qty: 3, unit: 'piece', macros, createdAt },
    ])
    const breakfast = await db.foodLog.where({ date: '2026-09-30', mealSlot: 'breakfast' }).toArray()
    expect(breakfast).toHaveLength(1)
    expect(breakfast[0]?.qty).toBe(2)
  })

  it('finds food items by lowercased alias', async () => {
    await db.foodItems.add({
      id: 'sambar',
      name: 'Sambar',
      aliases: ['Sambhar'],
      searchKeys: ['sambar', 'sambhar'],
      source: 'mess',
      archetypeId: 'sambar',
      servingUnits: [],
      updatedAt: new Date().toISOString(),
    })
    expect((await db.foodItems.where('searchKeys').equals('sambhar').first())?.id).toBe('sambar')
  })

  it('enforces one menu row per date + slot', async () => {
    await db.menuDays.add({ date: '2026-09-28', slot: 'lunch', foodIds: ['dal-tadka'] })
    await expect(db.menuDays.add({ date: '2026-09-28', slot: 'lunch', foodIds: [] })).rejects.toThrow()
  })
})

describe('ensureAppMeta', () => {
  it('creates meta and requests persistence on first launch', async () => {
    const storage = { persist: vi.fn().mockResolvedValue(true), persisted: vi.fn().mockResolvedValue(false) }
    const meta = await ensureAppMeta(db, storage as unknown as StorageManager)
    expect(storage.persist).toHaveBeenCalledOnce()
    expect(meta).toMatchObject({ splitPointer: 0, weeksSinceDeload: 0, persistGranted: true })
    expect((await db.appMeta.get(1))?.persistGranted).toBe(true)
  })

  it('does not ask again once granted', async () => {
    const storage = { persist: vi.fn().mockResolvedValue(true), persisted: vi.fn().mockResolvedValue(false) }
    await ensureAppMeta(db, storage as unknown as StorageManager)
    await ensureAppMeta(db, storage as unknown as StorageManager)
    expect(storage.persist).toHaveBeenCalledOnce()
  })

  it('keeps working when the Storage API is missing', async () => {
    const meta = await ensureAppMeta(db, undefined)
    expect(meta.persistRequested).toBe(false)
  })
})
