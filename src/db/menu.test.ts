import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildNameLookup, matchMenu, parseMenu, type ParsedMenu } from '../engine/menu'
import { applyMenuImport, type Resolution } from './menu'
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

function parsed(data: unknown): ParsedMenu {
  const r = parseMenu(data)
  if (!r.ok) throw new Error(r.errors.join('; '))
  return r.menu
}

async function match(menu: ParsedMenu) {
  return matchMenu(menu, buildNameLookup(await db.foodItems.toArray()))
}

const week = parsed({
  weekStart: '2026-09-28',
  days: [
    {
      date: '2026-09-28',
      breakfast: ['Masala Poha', 'French Toast'],
      lunch: ['Amritsari Chole', 'Veg Pulav', 'Dal Tadka', 'Paneer Butter Masaala'],
      dinner: ['Chicken Biriyani', 'Raita', 'Dragon Paneer'],
    },
    { date: '2026-09-29', dinner: ['Dragon Paneer', 'Roti'] },
  ],
})

describe('menu import', () => {
  it('matches seed dishes by name and alias, case-insensitive', async () => {
    const m = await match(week)
    expect(m.unmatched.map((u) => u.name)).toEqual(['Dragon Paneer', 'Paneer Butter Masaala', 'Raita'])
    expect(m.matchedCount).toBe(7)
    expect(m.totalCount).toBe(11)
  })

  it('creates new dishes, records aliases, and writes menu rows', async () => {
    const m = await match(week)
    const res = new Map<string, Resolution>([
      ['dragon paneer', { kind: 'new', archetypeId: 'paneer_dish' }],
      ['paneer butter masaala', { kind: 'alias', foodId: 'butter-paneer-masala' }],
      ['raita', { kind: 'skip' }],
    ])
    const summary = await applyMenuImport(db, week, m.unmatched, res)
    expect(summary).toEqual({ days: 2, created: 1, aliased: 1, skipped: 1 })

    expect(await db.foodItems.get('dragon-paneer')).toMatchObject({
      name: 'Dragon Paneer',
      source: 'mess',
      archetypeId: 'paneer_dish',
      slots: ['dinner'],
    })
    expect((await db.foodItems.get('butter-paneer-masala'))?.searchKeys).toContain('paneer butter masaala')

    const lunch = await db.menuDays.where({ date: '2026-09-28', slot: 'lunch' }).first()
    expect(lunch?.foodIds).toEqual(['amritsari-chole', 'veg-pulao', 'dal-tadka', 'butter-paneer-masala'])
    const dinner29 = await db.menuDays.where({ date: '2026-09-29', slot: 'dinner' }).first()
    expect(dinner29?.foodIds).toEqual(['dragon-paneer', 'roti'])
    // The skipped name (Raita) is left out; empty slots get no row.
    expect((await db.menuDays.where({ date: '2026-09-28', slot: 'dinner' }).first())?.foodIds).toEqual(['chicken-biryani', 'dragon-paneer'])
    expect(await db.menuDays.where({ date: '2026-09-28', slot: 'snacks' }).count()).toBe(0)
  })

  it('the next import recognises what was learned', async () => {
    const m = await match(week)
    await applyMenuImport(db, week, m.unmatched, new Map([
      ['dragon paneer', { kind: 'new', archetypeId: 'paneer_dish' }],
      ['paneer butter masaala', { kind: 'alias', foodId: 'butter-paneer-masala' }],
    ]))
    const again = await match(week)
    expect(again.unmatched.map((u) => u.name)).toEqual(['Raita'])
  })

  it('re-importing a date replaces its menu', async () => {
    await applyMenuImport(db, week, (await match(week)).unmatched, new Map())
    const fix = parsed({ days: [{ date: '2026-09-29', lunch: ['Roti'] }] })
    await applyMenuImport(db, fix, [], new Map())
    const rows = await db.menuDays.where('date').equals('2026-09-29').toArray()
    expect(rows.map((r) => [r.slot, r.foodIds])).toEqual([['lunch', ['roti']]])
    // Other dates are untouched.
    expect(await db.menuDays.where('date').equals('2026-09-28').count()).toBeGreaterThan(0)
  })
})

describe('docs/menu-example.json', () => {
  it('parses and leaves a realistic set of names to check', async () => {
    const example = (await import('../../docs/menu-example.json')).default
    const m = await match(parsed(example))
    expect(m.unmatched.map((u) => u.name)).toEqual([
      'Chole Bhature Mini',
      'Dragon Paneer',
      'Egg Curry',
      'Mirchi Ka Salan',
      'Paneer Butter Masaala',
      'Tea',
      'Veg Hakka Noodles',
    ])
  })
})
