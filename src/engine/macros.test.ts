import { describe, expect, it } from 'vitest'
import { splitMacros } from './macros'

describe('splitMacros', () => {
  it('sets protein by goal in g/kg', () => {
    expect(splitMacros(2500, 70, 'fat_loss').protein).toBeCloseTo(154)
    expect(splitMacros(2500, 70, 'muscle_gain').protein).toBeCloseTo(126)
    expect(splitMacros(2500, 70, 'recomp').protein).toBeCloseTo(140)
  })

  it('puts fat at 25% of calories when inside 0.6–1.5 g/kg', () => {
    // 2400 × 0.25 / 9 = 66.67 g; bounds for 70 kg are 42–105 g
    expect(splitMacros(2400, 70, 'recomp').fat).toBeCloseTo(66.67, 1)
  })

  it('clamps fat up to 0.6 g/kg', () => {
    // 1200 × 0.25 / 9 = 33.3 g < 0.6 × 90 = 54 g
    expect(splitMacros(1200, 90, 'fat_loss').fat).toBeCloseTo(54)
  })

  it('clamps fat down to 1.5 g/kg', () => {
    // 4000 × 0.25 / 9 = 111 g > 1.5 × 50 = 75 g
    expect(splitMacros(4000, 50, 'muscle_gain').fat).toBeCloseTo(75)
  })

  it('gives carbs the remaining calories', () => {
    const s = splitMacros(2400, 70, 'recomp')
    expect(s.protein * 4 + s.fat * 9 + s.carbs * 4).toBeCloseTo(2400)
  })

  it('never returns negative carbs', () => {
    expect(splitMacros(900, 100, 'fat_loss').carbs).toBe(0)
  })

  it('flags low carbs only during muscle gain', () => {
    // 1900 kcal, 90 kg: carbs ≈ 191.5 g < 3 × 90 = 270 g
    const low = splitMacros(1900, 90, 'muscle_gain')
    expect(low.lowCarbs).toBe(true)
    expect(splitMacros(1900, 90, 'recomp').lowCarbs).toBe(false)
    expect(splitMacros(3200, 70, 'muscle_gain').lowCarbs).toBe(false)
  })
})
