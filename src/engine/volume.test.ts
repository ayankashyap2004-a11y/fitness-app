import { describe, expect, it } from 'vitest'
import { deloadSets } from './deload'
import { actualWeekly, fractionalVolume, plannedWeekly, type MuscleLookup } from './volume'

const muscles: MuscleLookup = (id) =>
  ({
    bench: { primary: ['chest'], secondary: ['triceps'] },
    pushdown: { primary: ['triceps'], secondary: [] },
    row: { primary: ['back'], secondary: ['biceps', 'rear_delts'] },
  })[id] as never

describe('fractionalVolume', () => {
  it('counts direct sets as 1 and helper sets as 0.5', () => {
    expect(fractionalVolume([{ muscles: muscles('bench')!, sets: 3 }, { muscles: muscles('pushdown')!, sets: 2 }])).toEqual({ chest: 3, triceps: 3.5 })
  })
})

describe('plannedWeekly', () => {
  const days = [{ exercises: [{ gymId: 'bench', sets: 3 }] }, { exercises: [{ gymId: 'row', sets: 3 }, { gymId: 'unknown', sets: 9 }] }]

  it('sums the split, skipping unknown exercises', () => {
    expect(plannedWeekly(days, muscles)).toEqual({ chest: 3, triceps: 1.5, back: 3, biceps: 1.5, rear_delts: 1.5 })
  })

  it('halves the plan in a deload week', () => {
    expect(plannedWeekly(days, muscles, deloadSets)).toEqual({ chest: 2, triceps: 1, back: 2, biceps: 1, rear_delts: 1 })
  })
})

describe('actualWeekly', () => {
  it('counts each logged set once', () => {
    const sets = [{ exerciseId: 'bench' }, { exerciseId: 'bench' }, { exerciseId: 'row' }]
    expect(actualWeekly(sets, muscles)).toEqual({ chest: 2, triceps: 1, back: 1, biceps: 0.5, rear_delts: 0.5 })
  })
})
