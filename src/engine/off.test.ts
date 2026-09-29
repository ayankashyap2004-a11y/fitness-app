import { describe, expect, it } from 'vitest'
import { entryMacros, splitUnit, unitOptions } from './food'
import { offDisplayName, offLegacySearchUrl, offSearchUrl, offServing, parseOffProduct, parseOffSearch, servingUnitName } from './off'
import amulWhey from './__fixtures__/off-legacy-amul-whey.json'
import proteinBars from './__fixtures__/off-legacy-protein-bar.json'

// Shapes as returned by the two OFF search APIs (trimmed).
const WHEY = {
  code: '8901262260015',
  product_name: 'Whey Protein Rich Chocolate',
  brands: 'Amul,Amul Pro',
  quantity: '1 kg',
  serving_size: '1 scoop (33 g)',
  serving_quantity: 33,
  nutriments: {
    'energy-kcal_100g': 382,
    proteins_100g: 75.8,
    carbohydrates_100g: 9.1,
    fat_100g: 4.8,
    'energy-kcal_serving': 126,
    proteins_serving: 25,
    carbohydrates_serving: 3,
    fat_serving: 1.6,
  },
}

// Search-a-licious hit, per its index config: per-100 g nutriments only, product_name
// as a per-language object, brands as taxonomy tags.
const SAL_HIT = {
  code: '8904109400000',
  product_name: { main: 'Protein Bar Almond Fudge', en: 'Protein Bar Almond Fudge' },
  brands: ['yoga-bar'],
  quantity: '60 g',
  serving_size: '1 bar (60 g)',
  serving_quantity: 60,
  nutriments: { 'energy-kcal_100g': 400, 'energy-kj_100g': 1674, proteins_100g: 33.3, carbohydrates_100g: 40, fat_100g: 12, sugars_100g: 5 },
}

describe('parseOffProduct', () => {
  it('reads a Search-a-licious hit', () => {
    const p = parseOffProduct(SAL_HIT)
    expect(p).toMatchObject({
      barcode: '8904109400000',
      name: 'Protein Bar Almond Fudge',
      brand: 'Yoga Bar',
      servingGrams: 60,
      perServing: { kcal: 240, protein: 20, carbs: 24, fat: 7.2 },
    })
    expect(offDisplayName(p!)).toBe('Yoga Bar Protein Bar Almond Fudge')
    expect(offServing(p!).defaultUnit).toBe('bar (60 g)')
  })

  it('prefers the English name and strips language prefixes from brand tags', () => {
    const p = parseOffProduct({ ...SAL_HIT, product_name: { main: 'प्रोटीन बार', en: 'Protein Bar' }, brands: ['en:muscle-blaze'] })
    expect(p?.name).toBe('Protein Bar')
    expect(p?.brand).toBe('Muscle Blaze')
  })

  it('uses any language when there is no English or main name', () => {
    expect(parseOffProduct({ ...SAL_HIT, product_name: { fr: 'Barre protéinée' } })?.name).toBe('Barre protéinée')
  })

  it('reads per 100 g and per serving values', () => {
    expect(parseOffProduct(WHEY)).toEqual({
      barcode: '8901262260015',
      name: 'Whey Protein Rich Chocolate',
      brand: 'Amul',
      quantity: '1 kg',
      per100g: { kcal: 382, protein: 75.8, carbs: 9.1, fat: 4.8 },
      perServing: { kcal: 126, protein: 25, carbs: 3, fat: 1.6 },
      servingLabel: '1 scoop (33 g)',
      servingGrams: 33,
    })
  })

  it('converts kJ when kcal is missing, and accepts numeric strings', () => {
    const p = parseOffProduct({ code: '1', product_name: 'Biscuit', nutriments: { energy_100g: '2092', proteins_100g: '7,5' } })
    expect(p?.per100g).toEqual({ kcal: 500, protein: 7.5, carbs: 0, fat: 0 })
    expect(p?.perServing).toBeNull()
  })

  it('derives per serving from per 100 g and the serving weight', () => {
    const p = parseOffProduct({
      code: '2',
      product_name: 'Protein Bar',
      brands: ['Yoga Bar'],
      serving_quantity: '60',
      nutriments: { 'energy-kcal_100g': 400, proteins_100g: 33.3, carbohydrates_100g: 40, fat_100g: 12 },
    })
    expect(p?.brand).toBe('Yoga Bar')
    expect(p?.perServing).toEqual({ kcal: 240, protein: 20, carbs: 24, fat: 7.2 })
  })

  it('skips products without a name, barcode or calories', () => {
    expect(parseOffProduct({ code: '3', nutriments: { 'energy-kcal_100g': 100 } })).toBeNull()
    expect(parseOffProduct({ product_name: 'X', nutriments: { 'energy-kcal_100g': 100 } })).toBeNull()
    expect(parseOffProduct({ code: '4', product_name: 'Water', nutriments: { proteins_100g: 0 } })).toBeNull()
    expect(parseOffProduct(null)).toBeNull()
  })

  it('falls back to the English name', () => {
    expect(parseOffProduct({ code: '5', product_name_en: 'Masala Oats', nutriments: { 'energy-kcal_100g': 380 } })?.name).toBe('Masala Oats')
  })
})

describe('parseOffSearch', () => {
  it('reads Search-a-licious hits and legacy products, dropping duds and duplicates', () => {
    expect(parseOffSearch({ hits: [WHEY, { code: 'x' }, WHEY], count: 3 })).toHaveLength(1)
    expect(parseOffSearch({ hits: [SAL_HIT], count: 1, page: 1, page_size: 20, page_count: 1, took: 12, timed_out: false, is_count_exact: true })).toHaveLength(1)
    expect(parseOffSearch({ products: [WHEY], count: 1 })).toHaveLength(1)
    expect(parseOffSearch({ error: 'rate limited' })).toEqual([])
    expect(parseOffSearch('nope')).toEqual([])
  })
})

describe('offDisplayName', () => {
  it('puts the brand first unless it is already in the name', () => {
    expect(offDisplayName({ name: 'Whey Protein', brand: 'Amul' })).toBe('Amul Whey Protein')
    expect(offDisplayName({ name: 'Amul Taaza Milk', brand: 'Amul' })).toBe('Amul Taaza Milk')
    expect(offDisplayName({ name: 'Oats' })).toBe('Oats')
  })
})

describe('offServing', () => {
  it('logs by serving, with 100 g and g as alternatives', () => {
    const s = offServing(parseOffProduct(WHEY)!)
    expect(s.defaultUnit).toBe('scoop (33 g)')
    expect(s.perPortion.protein).toBe(25)
    const units = unitOptions(s.defaultUnit, s.servingUnits)
    // 66 g = 2 scoops
    expect(entryMacros(s.perPortion, units, 'g', 66)).toEqual({ kcal: 252, protein: 50, carbs: 6, fat: 3.2 })
    expect(entryMacros(s.perPortion, units, '100 g', 1).kcal).toBe(382)
  })

  it('falls back to per 100 g with grams', () => {
    const s = offServing(parseOffProduct({ code: '1', product_name: 'Peanut Butter', nutriments: { 'energy-kcal_100g': 600, proteins_100g: 25 } })!)
    expect(s.defaultUnit).toBe('100 g')
    expect(entryMacros(s.perPortion, unitOptions(s.defaultUnit, s.servingUnits), 'g', 32)).toMatchObject({ kcal: 192, protein: 8 })
  })

  it('uses a bare serving when its weight is unknown', () => {
    const s = offServing(parseOffProduct({ code: '1', product_name: 'Cookie', nutriments: { 'energy-kcal_serving': 80 } })!)
    expect(s).toEqual({ defaultUnit: 'serving', perPortion: { kcal: 80, protein: 0, carbs: 0, fat: 0 }, servingUnits: [] })
  })
})

describe('servingUnitName', () => {
  it('turns printed servings into clean units', () => {
    expect(servingUnitName('1 scoop (33 g)')).toBe('scoop (33 g)')
    expect(servingUnitName('1 bar')).toBe('bar')
    expect(servingUnitName('30 g')).toBe('serving (30 g)')
    expect(servingUnitName('2 biscuits (25 g)')).toBe('serving (2 biscuits 25 g)')
    expect(servingUnitName(undefined, 40)).toBe('serving (40 g)')
    expect(servingUnitName(undefined)).toBe('serving')
  })

  it('splits into a chip label and detail', () => {
    expect(splitUnit(servingUnitName('1 scoop (33 g)'))).toEqual({ label: 'scoop', detail: '33 g' })
  })
})

describe('search URLs', () => {
  it('encodes the query', () => {
    expect(offSearchUrl(' amul whey ')).toContain('search.openfoodfacts.org/search?q=amul%20whey&')
    expect(offLegacySearchUrl('dal & rice')).toContain('search_terms=dal%20%26%20rice&')
  })
})

// Real responses recorded from the Open Food Facts legacy search API (staging mirror,
// world.openfoodfacts.net, 2026-09-30), nutriments trimmed to the fields the app reads.

describe('real Open Food Facts responses', () => {
  it('parses the "amul whey" search, skipping the product with no nutrition', () => {
    const products = parseOffSearch(amulWhey)
    expect(amulWhey.products).toHaveLength(6)
    expect(products.map((p) => p.barcode)).not.toContain('8901262130301')
    expect(products).toHaveLength(5)
  })

  it('logs Amul whey by the scoop from its label', () => {
    const scoop = parseOffSearch(amulWhey).find((p) => p.barcode === '8901262110259')!
    const s = offServing(scoop)
    expect(offDisplayName(scoop)).toBe('Amul Whey protein')
    expect(s.defaultUnit).toBe('Scoop (32 g)')
    expect(s.perPortion).toEqual({ kcal: 128, protein: 25, carbs: expect.any(Number), fat: expect.any(Number) })
  })

  it('falls back to per 100 g when a product has no serving info', () => {
    const p = parseOffSearch(amulWhey).find((x) => x.barcode === '8901262110266')!
    expect(offServing(p)).toMatchObject({ defaultUnit: '100 g', perPortion: { kcal: 383, protein: 74 } })
  })

  it('parses every protein bar with a per-bar unit', () => {
    const bars = parseOffSearch(proteinBars)
    expect(bars).toHaveLength(proteinBars.products.length)
    const daily = bars.find((b) => b.barcode === '8904335602392')!
    expect(offServing(daily)).toMatchObject({ defaultUnit: 'bar (50 g)', perPortion: { kcal: 190, protein: 10 } })
    // Brand already in the name: not repeated.
    expect(offDisplayName(bars.find((b) => b.barcode === '8904335602385')!)).toBe('Yoga Bar Protein Bar')
  })
})
