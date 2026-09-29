import { describe, expect, it } from 'vitest'
import { computeTargets, goalCalories, type TargetInput } from './targets'

describe('goalCalories', () => {
  it('fat loss uses fixed deficits', () => {
    expect(goalCalories(2600, 'fat_loss', 'mild')).toBe(2350)
    expect(goalCalories(2600, 'fat_loss', 'moderate')).toBe(2100)
    expect(goalCalories(2600, 'fat_loss', 'aggressive')).toBe(1850)
  })

  it('muscle gain uses ×1.05 / ×1.10 / ×1.15', () => {
    expect(goalCalories(2600, 'muscle_gain', 'mild')).toBeCloseTo(2730)
    expect(goalCalories(2600, 'muscle_gain', 'moderate')).toBeCloseTo(2860)
    expect(goalCalories(2600, 'muscle_gain', 'aggressive')).toBeCloseTo(2990)
  })

  it('recomp is maintenance regardless of intensity', () => {
    expect(goalCalories(2600, 'recomp', 'aggressive')).toBe(2600)
  })
})

const base: TargetInput = {
  sex: 'male',
  dob: '2004-01-15',
  heightCm: 175,
  activityLevel: 'moderate',
  goal: 'fat_loss',
  intensity: 'moderate',
  weightKg: 70,
  today: '2026-09-30', // age 22
}

describe('computeTargets', () => {
  it('runs the full pipeline for a moderate fat-loss case', () => {
    // BMR 1688.75 → TDEE 2617.56 → −500 = 2117.56
    const t = computeTargets(base)
    expect(t.age).toBe(22)
    expect(t.bmr).toBe(1689)
    expect(t.tdee).toBe(2618)
    expect(t.kcal).toBe(2118)
    expect(t.protein).toBe(154) // 2.2 × 70
    expect(t.fat).toBe(59) // 2117.56 × 0.25 / 9 = 58.8
    expect(t.carbs).toBe(243) // (2117.56 − 616 − 529.39) / 4
    expect(t.notes).toEqual({ flooredToBmr: false, aggressiveDeficit: false, lowCarbs: false })
  })

  it('never goes below BMR, and says so', () => {
    const t = computeTargets({
      ...base,
      sex: 'female',
      heightCm: 155,
      weightKg: 50,
      dob: '1996-01-01', // age 30
      activityLevel: 'sedentary',
      intensity: 'aggressive',
    })
    // BMR 1157.75, TDEE 1389.3, −750 = 639.3 → floored
    expect(t.kcal).toBe(1158)
    expect(t.kcal).toBe(t.bmr)
    expect(t.notes.flooredToBmr).toBe(true)
  })

  it('warns on the aggressive fat-loss setting', () => {
    expect(computeTargets({ ...base, intensity: 'aggressive' }).notes.aggressiveDeficit).toBe(true)
    expect(computeTargets({ ...base, goal: 'muscle_gain', intensity: 'aggressive' }).notes.aggressiveDeficit).toBe(false)
  })

  it('applies the muscle gain surplus to TDEE', () => {
    const t = computeTargets({ ...base, goal: 'muscle_gain', intensity: 'moderate' })
    expect(t.kcal).toBe(2879) // 2617.56 × 1.10
    expect(t.protein).toBe(126)
  })

  it('recalculates age as time passes', () => {
    expect(computeTargets({ ...base, today: '2027-01-15' }).age).toBe(23)
  })

  it('moves targets with bodyweight', () => {
    const lighter = computeTargets({ ...base, weightKg: 68 })
    expect(lighter.kcal).toBeLessThan(computeTargets(base).kcal)
  })
})
