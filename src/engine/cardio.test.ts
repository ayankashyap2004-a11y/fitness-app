import { describe, expect, it } from 'vitest'
import { acsmVO2, cardioWeek, estimateCardioKcal, kcalFromMET, validateCardio } from './cardio'

describe('cardioWeek', () => {
  it('totals the Monday–Sunday week only', () => {
    const logs = [
      { date: '2026-09-27', durationMin: 60 }, // previous Sunday
      { date: '2026-09-28', durationMin: 30, distanceKm: 3.2, kcalEstimate: 250 },
      { date: '2026-10-01', durationMin: 25.5 },
      { date: '2026-10-04', durationMin: 45, distanceKm: 5, kcalEstimate: 300.4 },
      { date: '2026-10-05', durationMin: 20 }, // next Monday
    ]
    expect(cardioWeek(logs, '2026-09-28')).toEqual({ sessions: 3, minutes: 101, km: 8.2, kcal: 550 })
  })

  it('is zero with no cardio', () => {
    expect(cardioWeek([], '2026-09-28')).toEqual({ sessions: 0, minutes: 0, km: 0, kcal: 0 })
  })
})

describe('validateCardio', () => {
  it('needs a sensible duration; distance is optional', () => {
    expect(validateCardio(30, undefined)).toEqual({})
    expect(validateCardio(0, undefined).durationMin).toBeDefined()
    expect(validateCardio(700, undefined).durationMin).toBeDefined()
    expect(validateCardio(30, -1).distanceKm).toBeDefined()
    expect(validateCardio(30, 5)).toEqual({})
  })

  it('checks treadmill speed and incline when given', () => {
    expect(validateCardio(30, undefined, 10, 5)).toEqual({})
    expect(validateCardio(30, undefined, 40, undefined).speedKmh).toBeDefined()
    expect(validateCardio(30, undefined, 10, 35).inclinePct).toBeDefined()
  })
})

describe('ACSM equations', () => {
  it('running: 0.2·v + 0.9·v·grade + 3.5', () => {
    // 10 km/h = 166.67 m/min
    expect(acsmVO2('run', 10)).toBeCloseTo(36.83, 2)
    expect(acsmVO2('run', 10, 5)).toBeCloseTo(44.33, 2)
  })

  it('walking: 0.1·v + 1.8·v·grade + 3.5', () => {
    // 5 km/h = 83.33 m/min at 10 % incline
    expect(acsmVO2('walk', 5, 10)).toBeCloseTo(26.83, 2)
  })
})

describe('estimateCardioKcal (70 kg)', () => {
  it('running from speed and incline', () => {
    expect(estimateCardioKcal({ type: 'run', durationMin: 30, speedKmh: 10 }, 70)).toBe(387)
    expect(estimateCardioKcal({ type: 'run', durationMin: 30, speedKmh: 10, inclinePct: 5 }, 70)).toBe(466) // 465.5 rounds up
  })

  it('incline walking', () => {
    expect(estimateCardioKcal({ type: 'walk', durationMin: 30, speedKmh: 5, inclinePct: 10 }, 70)).toBe(282)
  })

  it('derives speed from distance when speed is missing', () => {
    // 5 km in 30 min = 10 km/h
    expect(estimateCardioKcal({ type: 'run', durationMin: 30, distanceKm: 5 }, 70)).toBe(387)
  })

  it('pickleball from METs: doubles 4.1, singles 5.8', () => {
    expect(kcalFromMET(4.1, 70, 60)).toBeCloseTo(301.35, 2)
    expect(estimateCardioKcal({ type: 'pickleball', durationMin: 60 }, 70)).toBe(301)
    expect(estimateCardioKcal({ type: 'pickleball', durationMin: 60, intensity: 'singles' }, 70)).toBe(426)
  })

  it('returns null without enough information', () => {
    expect(estimateCardioKcal({ type: 'run', durationMin: 30 }, 70)).toBeNull()
    expect(estimateCardioKcal({ type: 'swim', durationMin: 30 }, 70)).toBeNull()
    expect(estimateCardioKcal({ type: 'run', durationMin: 30, speedKmh: 10 }, undefined)).toBeNull()
  })
})
