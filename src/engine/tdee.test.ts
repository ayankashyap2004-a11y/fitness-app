import { describe, expect, it } from 'vitest'
import { ACTIVITY_FACTORS, tdee } from './tdee'

describe('tdee', () => {
  it('uses the PRD §4.1 factors', () => {
    expect(ACTIVITY_FACTORS).toEqual({ sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 })
  })

  it('multiplies BMR by the activity factor', () => {
    expect(tdee(1700, 'moderate')).toBeCloseTo(2635)
    expect(tdee(1700, 'sedentary')).toBeCloseTo(2040)
  })
})
