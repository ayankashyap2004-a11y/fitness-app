import { describe, expect, it } from 'vitest'
import { bmr } from './bmr'

describe('bmr (Mifflin-St Jeor)', () => {
  it('male: 10w + 6.25h − 5a + 5', () => {
    // 700 + 1093.75 − 110 + 5
    expect(bmr({ sex: 'male', weightKg: 70, heightCm: 175, age: 22 })).toBeCloseTo(1688.75)
  })

  it('female: 10w + 6.25h − 5a − 161', () => {
    // 600 + 1006.25 − 150 − 161
    expect(bmr({ sex: 'female', weightKg: 60, heightCm: 161, age: 30 })).toBeCloseTo(1295.25)
  })

  it('differs between sexes by exactly 166 kcal', () => {
    const body = { weightKg: 80, heightCm: 180, age: 25 }
    expect(bmr({ sex: 'male', ...body }) - bmr({ sex: 'female', ...body })).toBeCloseTo(166)
  })
})
