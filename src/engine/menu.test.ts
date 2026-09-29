import { describe, expect, it } from 'vitest'
import {
  buildNameLookup,
  levenshtein,
  matchMenu,
  nameSimilarity,
  normalizeName,
  parseMenu,
  parseMenuText,
  planTonight,
  proteinBeforeDinner,
  slugify,
  suggestDishes,
} from './menu'

const PRD_EXAMPLE = {
  weekStart: '2026-09-28',
  days: [
    {
      date: '2026-09-28',
      breakfast: ['Masala Poha', 'French Toast'],
      lunch: ['Amritsari Chole', 'Kulche', 'Veg Pulav', 'Boondi Raita', 'Dal Tadka', 'Pakoda Kadi'],
      snacks: ['Bhel'],
      dinner: ['Paneer Paratha', 'Achari Aloo Paratha', 'Yellow Dal', 'Coriander Rice', 'Curd'],
      dessert: ['Chocolate Pudding'],
    },
  ],
}

describe('normalizeName', () => {
  it('ignores case and extra spaces', () => {
    expect(normalizeName('  Dal   TADKA ')).toBe('dal tadka')
  })
})

describe('parseMenu', () => {
  it('accepts the PRD example', () => {
    const r = parseMenu(PRD_EXAMPLE)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.menu.days).toHaveLength(1)
      expect(r.menu.days[0]!.slots.lunch).toHaveLength(6)
    }
  })

  it('treats missing slots as empty and drops blanks and duplicates', () => {
    const r = parseMenu({ days: [{ date: '2026-09-29', lunch: ['Dal', ' ', 'dal', 'Roti'] }] })
    expect(r.ok && r.menu.days[0]!.slots).toEqual({ breakfast: [], lunch: ['Dal', 'Roti'], snacks: [], dinner: [], dessert: [] })
  })

  it('sorts days by date', () => {
    const r = parseMenu({ days: [{ date: '2026-09-30' }, { date: '2026-09-28' }] })
    expect(r.ok && r.menu.days.map((d) => d.date)).toEqual(['2026-09-28', '2026-09-30'])
  })

  it('rejects bad structure with readable errors', () => {
    expect(parseMenu([])).toEqual({ ok: false, errors: ['Expected an object with "days".'] })
    expect(parseMenu({ days: [] }).ok).toBe(false)
    const r = parseMenu({ days: [{ date: '2026-02-30' }, { date: '2026-09-28', lunch: 'Dal' }, { date: '2026-09-28' }] })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors).toEqual([
        'Day 1: "date" must be YYYY-MM-DD.',
        '2026-09-28: "lunch" must be a list of dish names.',
        '2026-09-28 appears twice.',
      ])
    }
  })
})

describe('parseMenuText', () => {
  it('reads JSON inside a chat code fence', () => {
    const text = 'Here you go:\n```json\n' + JSON.stringify(PRD_EXAMPLE) + '\n```\nEnjoy!'
    expect(parseMenuText(text).ok).toBe(true)
  })

  it('explains invalid JSON', () => {
    expect(parseMenuText('{"days": [')).toEqual({ ok: false, errors: ["That isn't valid JSON. Check it was copied in full."] })
  })
})

describe('matchMenu', () => {
  const lookup = buildNameLookup([
    { id: 'dal-tadka', searchKeys: ['dal tadka'] },
    { id: 'veg-pulao', searchKeys: ['veg pulao', 'veg pulav'] },
  ])

  it('matches names and aliases, collecting the rest', () => {
    const r = parseMenu({
      days: [
        { date: '2026-09-28', lunch: ['DAL TADKA', 'Veg Pulav', 'Mystery Sabzi'] },
        { date: '2026-09-29', dinner: ['mystery sabzi'] },
      ],
    })
    if (!r.ok) throw new Error('parse failed')
    const m = matchMenu(r.menu, lookup)
    expect(m.matchedCount).toBe(2)
    expect(m.totalCount).toBe(4)
    expect(m.unmatched).toEqual([{ name: 'Mystery Sabzi', key: 'mystery sabzi', slots: ['lunch', 'dinner'], count: 2 }])
  })
})

describe('fuzzy suggestions', () => {
  it('levenshtein', () => {
    expect(levenshtein('biryani', 'biriyani')).toBe(1)
    expect(levenshtein('kitten', 'sitting')).toBe(3)
  })

  it('tolerates one typo per word, at a discount', () => {
    expect(nameSimilarity('Paneer Butter Masaala', 'butter paneer masala')).toBeCloseTo(11 / 12) // 2 exact + 1 fuzzy, any order
    expect(nameSimilarity('Butter Paneer Masala', 'paneer butter masala')).toBe(1)
    expect(nameSimilarity('Paneer Tikka', 'paneer butter masala')).toBeCloseTo(0.4)
    expect(nameSimilarity('Dal', 'Daal')).toBe(0) // too short to fuzz
    expect(nameSimilarity('Mirchi Ka Salan', 'salad')).toBeLessThan(0.5) // one fuzzy word isn't enough
  })

  it('suggests the closest dishes above the threshold', () => {
    const items = [
      { id: 'chicken-biryani', searchKeys: ['chicken biryani'] },
      { id: 'veg-biryani', searchKeys: ['veg biryani'] },
      { id: 'roti', searchKeys: ['roti'] },
    ]
    // Two typos: still the clear winner; veg biryani shares only one fuzzy word
    expect(suggestDishes('Chiken Biriyani', items)).toEqual([{ id: 'chicken-biryani', score: 0.75 }])
    expect(suggestDishes('Hyderabadi Veg Biryani', items).map((s) => s.id)).toEqual(['veg-biryani'])
    expect(suggestDishes('Pizza', items)).toEqual([])
  })
})

describe('slugify', () => {
  it('builds unique ids', () => {
    expect(slugify('Paneer Butter Masala!', new Set())).toBe('paneer-butter-masala')
    expect(slugify('Roti', new Set(['roti', 'roti-2']))).toBe('roti-3')
  })
})

describe('planTonight', () => {
  it('picks the non-veg dish on a non-veg night', () => {
    const plan = planTonight([
      { name: 'Paneer Paratha', protein: 9, nonVeg: false },
      { name: 'Butter Chicken', protein: 18, nonVeg: true },
      { name: 'Yellow Dal', protein: 7, nonVeg: false },
    ])
    expect(plan).toEqual({ main: { name: 'Butter Chicken', protein: 18, nonVeg: true }, isVeg: false })
  })

  it('picks the highest-protein dish on a veg night', () => {
    const plan = planTonight([
      { name: 'Yellow Dal', protein: 7, nonVeg: false },
      { name: 'Paneer Bhurji', protein: 15, nonVeg: false },
    ])
    expect(plan?.main.name).toBe('Paneer Bhurji')
    expect(plan?.isVeg).toBe(true)
  })

  it('returns null without a dinner menu', () => {
    expect(planTonight([])).toBeNull()
  })
})

describe('proteinBeforeDinner', () => {
  it('is target minus eaten minus the main', () => {
    expect(proteinBeforeDinner(150, 60, 18)).toBe(72)
  })

  it('never goes negative', () => {
    expect(proteinBeforeDinner(150, 140, 18)).toBe(0)
  })
})
