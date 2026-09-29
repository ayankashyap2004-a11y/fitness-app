import { describe, expect, it } from 'vitest'
import { parseDecimal, validateProfile, type ProfileDraft } from './profile'

const valid: ProfileDraft = {
  name: 'Ayan',
  sex: 'male',
  dob: '2003-05-10',
  heightCm: '175',
  weightKg: '72.5',
  activityLevel: 'moderate',
  goal: 'fat_loss',
  intensity: 'moderate',
}
const today = '2026-09-30'

describe('parseDecimal', () => {
  it('accepts dot or comma decimals', () => {
    expect(parseDecimal('72.5')).toBe(72.5)
    expect(parseDecimal(' 72,5 ')).toBe(72.5)
    expect(parseDecimal('175')).toBe(175)
  })

  it('rejects junk, negatives and blanks', () => {
    expect(parseDecimal('')).toBeNaN()
    expect(parseDecimal('-70')).toBeNaN()
    expect(parseDecimal('70kg')).toBeNaN()
  })
})

describe('validateProfile', () => {
  it('passes a complete profile', () => {
    expect(validateProfile(valid, today)).toEqual({})
  })

  it('flags every missing field', () => {
    const empty: ProfileDraft = { name: ' ', sex: '', dob: '', heightCm: '', weightKg: '', activityLevel: '', goal: '', intensity: 'moderate' }
    expect(Object.keys(validateProfile(empty, today)).sort()).toEqual(
      ['activityLevel', 'dob', 'goal', 'heightCm', 'name', 'sex', 'weightKg'].sort(),
    )
  })

  it('checks ranges', () => {
    expect(validateProfile({ ...valid, heightCm: '90' }, today).heightCm).toMatch(/100–250/)
    expect(validateProfile({ ...valid, weightKg: '400' }, today).weightKg).toMatch(/30–300/)
    expect(validateProfile({ ...valid, dob: '2020-01-01' }, today).dob).toMatch(/13–100/)
  })

  it('only checks the requested fields', () => {
    const errors = validateProfile({ ...valid, weightKg: '', goal: '' }, today, ['name', 'sex', 'dob'])
    expect(errors).toEqual({})
  })
})
