import { describe, expect, it } from 'vitest'
import {
  defaultServing,
  entryMacros,
  resolveFood,
  resolvePortion,
  searchKeysFor,
  slotForTime,
  snapQty,
  splitUnit,
  sumMacros,
  unitOptions,
  type ArchetypeLike,
  type FoodItemLike,
} from './food'

const rice: ArchetypeLike = {
  name: 'Plain rice',
  defaultUnit: 'katori (~150 g)',
  perPortion: { kcal: 195, protein: 4, carbs: 43.6, fat: 0.5 },
  altUnits: [{ unit: 'ladle', factor: 0.5 }],
  sourced: true,
}

const dish: FoodItemLike = {
  id: 'jeera-rice',
  name: 'Jeera Rice',
  source: 'mess',
  searchKeys: ['jeera rice'],
  archetypeId: 'plain_rice',
  servingUnits: [],
  slots: ['lunch'],
  timesOnMenu: 5,
}

describe('splitUnit', () => {
  it('pulls out the parenthetical', () => {
    expect(splitUnit('katori (~150 g)')).toEqual({ label: 'katori', detail: '~150 g' })
    expect(splitUnit('piece (bone-in)')).toEqual({ label: 'piece', detail: 'bone-in' })
  })

  it('drops a leading "per"', () => {
    expect(splitUnit('per egg used')).toEqual({ label: 'egg used' })
  })

  it('leaves plain units alone', () => {
    expect(splitUnit('2 eggs + gravy')).toEqual({ label: '2 eggs + gravy' })
  })
})

describe('unitOptions', () => {
  it('puts the default portion first at factor 1', () => {
    expect(unitOptions('katori (~150 g)', [{ unit: 'ladle', factor: 0.5 }])).toEqual([
      { unit: 'katori (~150 g)', label: 'katori', detail: '~150 g', factor: 1 },
      { unit: 'ladle', label: 'ladle', factor: 0.5 },
    ])
  })
})

describe('resolvePortion', () => {
  const base = { kcal: 200, protein: 4, carbs: 20, fat: 12 }

  it('dish override beats archetype, field by field', () => {
    expect(resolvePortion(base, { kcal: 250, fat: 17 })).toEqual({ kcal: 250, protein: 4, carbs: 20, fat: 17 })
  })

  it('user edit beats both', () => {
    expect(resolvePortion(base, { kcal: 250, fat: 17 }, { kcal: 280 })).toEqual({ kcal: 280, protein: 4, carbs: 20, fat: 17 })
  })
})

describe('entryMacros', () => {
  const units = unitOptions(rice.defaultUnit, rice.altUnits)

  it('scales by unit factor × quantity', () => {
    // 3 ladles = 1.5 katori
    expect(entryMacros(rice.perPortion, units, 'ladle', 3)).toEqual({ kcal: 293, protein: 6, carbs: 65.4, fat: 0.8 })
  })

  it('handles half portions', () => {
    expect(entryMacros(rice.perPortion, units, 'katori (~150 g)', 0.5).kcal).toBe(98)
  })

  it('falls back to the default portion for an unknown unit', () => {
    expect(entryMacros(rice.perPortion, units, 'bucket', 1).kcal).toBe(195)
  })
})

describe('snapQty', () => {
  it('snaps to 0.5 steps with a floor', () => {
    expect(snapQty(1.3)).toBe(1.5)
    expect(snapQty(1.2)).toBe(1)
    expect(snapQty(0)).toBe(0.5)
    expect(snapQty(0, 0)).toBe(0)
    expect(snapQty(NaN)).toBe(0.5)
  })
})

describe('sumMacros', () => {
  it('adds and rounds', () => {
    expect(
      sumMacros([
        { kcal: 78, protein: 6.3, carbs: 1.3, fat: 5.3 },
        { kcal: 78, protein: 6.3, carbs: 1.3, fat: 5.3 },
      ]),
    ).toEqual({ kcal: 156, protein: 12.6, carbs: 2.6, fat: 10.6 })
  })

  it('is zero for nothing', () => {
    expect(sumMacros([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })
})

describe('slotForTime', () => {
  it('follows mess timings', () => {
    expect(slotForTime(7, 45)).toBe('breakfast')
    expect(slotForTime(10, 30)).toBe('lunch')
    expect(slotForTime(16)).toBe('snacks')
    expect(slotForTime(20)).toBe('dinner')
  })
})

describe('resolveFood', () => {
  it('inherits archetype macros and units', () => {
    const v = resolveFood(dish, rice)!
    expect(v.portion).toEqual(rice.perPortion)
    expect(v.units.map((u) => u.label)).toEqual(['katori', 'ladle'])
    expect(v.archetypeName).toBe('Plain rice')
    expect(v.sourced).toBe(true)
    expect(v.edited).toBe(false)
  })

  it('marks overridden or user-edited dishes as not sourced', () => {
    expect(resolveFood({ ...dish, override: { kcal: 250 } }, rice)!.sourced).toBe(false)
    const edited = resolveFood({ ...dish, userOverride: { kcal: 180 } }, rice)!
    expect(edited.portion.kcal).toBe(180)
    expect(edited.edited).toBe(true)
    expect(edited.sourced).toBe(false)
  })

  it('treats an empty user override as unedited', () => {
    expect(resolveFood({ ...dish, userOverride: {} }, rice)!.edited).toBe(false)
  })

  it('uses the item’s own values when there is no archetype', () => {
    const oil: FoodItemLike = {
      id: 'extra-oil',
      name: 'Extra oil',
      source: 'bundled',
      searchKeys: ['extra oil'],
      perPortion: { kcal: 45, protein: 0, carbs: 0, fat: 5 },
      defaultUnit: 'tsp',
      servingUnits: [{ unit: 'tbsp', factor: 3 }],
    }
    const v = resolveFood(oil)!
    expect(v.portion.kcal).toBe(45)
    expect(v.units.map((u) => u.unit)).toEqual(['tsp', 'tbsp'])
  })

  it('returns null when a dish has no values at all', () => {
    expect(resolveFood(dish)).toBeNull()
  })
})

describe('defaultServing', () => {
  const units = unitOptions(rice.defaultUnit, rice.altUnits)

  it('starts at 1 default portion', () => {
    expect(defaultServing({ units })).toEqual({ qty: 1, unit: 'katori (~150 g)' })
  })

  it('remembers the last quantity and unit', () => {
    expect(defaultServing({ units, lastQty: 2.5, lastUnit: 'ladle' })).toEqual({ qty: 2.5, unit: 'ladle' })
  })

  it('ignores a last unit that no longer exists', () => {
    expect(defaultServing({ units, lastQty: 2, lastUnit: 'bowl' })).toEqual({ qty: 1, unit: 'katori (~150 g)' })
  })
})

describe('searchKeysFor', () => {
  it('lowercases and de-duplicates name and aliases', () => {
    expect(searchKeysFor('Paneer Do Pyaza', ['paneer do pyaza', 'Paneer Do Pyaaza'])).toEqual(['paneer do pyaza', 'paneer do pyaaza'])
  })
})
