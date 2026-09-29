import { describe, expect, it } from 'vitest'
import { searchFoods } from './search'

const items = [
  { name: 'Dal Tadka', searchKeys: ['dal tadka', 'daal tadka'], timesOnMenu: 6 },
  { name: 'Dal Makhani', searchKeys: ['dal makhani'], timesOnMenu: 3 },
  { name: 'Yellow Dal', searchKeys: ['yellow dal'], timesOnMenu: 9 },
  { name: 'Sambar', searchKeys: ['sambar', 'sambhar'], timesOnMenu: 4 },
  { name: 'Dal', searchKeys: ['dal'], timesOnMenu: 1 },
  { name: 'Mandal Special', searchKeys: ['mandal special'], timesOnMenu: 20 },
]
const names = (q: string) => searchFoods(items, q).map((i) => i.name)

describe('searchFoods', () => {
  it('returns nothing for an empty query', () => {
    expect(searchFoods(items, '   ')).toEqual([])
  })

  it('ranks exact, then prefix, then word prefix, then substring', () => {
    expect(names('dal')).toEqual(['Dal', 'Dal Tadka', 'Dal Makhani', 'Yellow Dal', 'Mandal Special'])
  })

  it('matches aliases, ignoring case', () => {
    expect(names('SAMBHAR')).toEqual(['Sambar'])
    expect(names('daal')).toEqual(['Dal Tadka'])
  })

  it('needs every word to match', () => {
    expect(names('tad dal')).toEqual(['Dal Tadka'])
    expect(names('dal paneer')).toEqual([])
  })

  it('respects the limit', () => {
    expect(searchFoods(items, 'dal', 2)).toHaveLength(2)
  })
})
