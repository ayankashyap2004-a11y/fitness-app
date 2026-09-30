import { describe, expect, it } from 'vitest'
import { dinnerSummary, proteinLeft } from './dinner'

describe('dinnerSummary', () => {
  it('is null until dinner is logged', () => {
    expect(dinnerSummary([])).toBeNull()
  })

  it('names the highest-protein logged item and totals protein', () => {
    expect(
      dinnerSummary([
        { name: 'Roti', protein: 6 },
        { name: 'Chicken Dum Biryani', protein: 20 },
        { name: 'Yellow Dal', protein: 7 },
      ]),
    ).toEqual({ main: { name: 'Chicken Dum Biryani', protein: 20 }, protein: 33 })
  })

  it('keeps the first item on a tie', () => {
    expect(dinnerSummary([{ name: 'A', protein: 5 }, { name: 'B', protein: 5 }])?.main.name).toBe('A')
  })
})

describe('proteinLeft', () => {
  it('is target minus eaten, never negative', () => {
    expect(proteinLeft(150, 104.4)).toBe(46)
    expect(proteinLeft(150, 170)).toBe(0)
  })
})
