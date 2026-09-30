import { describe, expect, it } from 'vitest'
import exercisesJson from '../data/exercises.json'
import splitJson from '../data/split.json'
import { fractionalVolume } from './volume'
import {
  availableIn,
  formatClock,
  formatRepRange,
  formatRest,
  formatWeight,
  lastSessionSets,
  lastTimeLabel,
  moveItem,
  newTemplateKey,
  nextDayIndex,
  planForMode,
  prefillSet,
  restAfter,
  restRemaining,
  summarize,
  swapCandidates,
  type DayTemplate,
  type ExerciseDef,
  type LoggedSet,
} from './workout'

const EXERCISES = exercisesJson as ExerciseDef[]
const SPLIT = splitJson as DayTemplate[]
const byId = new Map(EXERCISES.map((e) => [e.id, e]))

describe('seed data', () => {
  it('has a 5-day split whose entries all point at real exercises', () => {
    expect(SPLIT.map((d) => d.name)).toEqual(['Push', 'Pull', 'Legs', 'Upper', 'Lower'])
    for (const day of SPLIT)
      for (const e of day.exercises) {
        expect(byId.get(e.gymId), e.gymId).toBeDefined()
        expect(byId.get(e.homeId), e.homeId).toBeDefined()
      }
  })

  it('pairs every entry with a gym-capable and a home-capable exercise', () => {
    for (const day of SPLIT)
      for (const e of day.exercises) {
        expect(availableIn(byId.get(e.gymId)!, 'gym'), e.gymId).toBe(true)
        expect(availableIn(byId.get(e.homeId)!, 'home'), e.homeId).toBe(true)
      }
  })

  it('gives every exercise 3–5 how-to steps, cues and mistakes', () => {
    for (const e of EXERCISES) {
      expect(e.howTo.length, e.id).toBeGreaterThanOrEqual(3)
      expect(e.howTo.length, e.id).toBeLessThanOrEqual(5)
      expect(e.cues.length, e.id).toBeGreaterThan(0)
      expect(e.mistakes.length, e.id).toBeGreaterThan(0)
    }
  })

  it('uses unique template keys', () => {
    const keys = SPLIT.flatMap((d) => d.exercises.map((e) => e.key))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('matches the PRD §4.4 weekly volume table at the gym', () => {
    const items = SPLIT.flatMap((d) => d.exercises.map((e) => ({ muscles: byId.get(e.gymId)!.muscles, sets: e.sets })))
    expect(fractionalVolume(items)).toMatchObject({
      chest: 13,
      back: 14,
      side_delts: 8,
      rear_delts: 7,
      biceps: 14,
      triceps: 12,
      quads: 12.5,
      hamstrings: 10.5,
      glutes: 10.5,
      calves: 7,
      abs: 3,
    })
  })
})

describe('planForMode', () => {
  it('picks the gym or home exercise and its note', () => {
    const push = SPLIT[0]!
    expect(planForMode(push, 'gym')[0]).toMatchObject({ key: 'push-1', exerciseId: 'barbell-bench-press', sets: 3, repRange: [6, 8] })
    expect(planForMode(push, 'home')[0]).toMatchObject({ exerciseId: 'db-floor-press', note: 'or deficit push-ups' })
  })
})

describe('rotation', () => {
  it('wraps after the last day', () => {
    expect(nextDayIndex(0, 5)).toBe(1)
    expect(nextDayIndex(4, 5)).toBe(0)
  })
})

const set = (sessionId: number, setNo: number, weightKg: number, reps: number): LoggedSet => ({
  sessionId,
  exerciseId: 'barbell-bench-press',
  setNo,
  weightKg,
  reps,
})

describe('last time', () => {
  const order = new Map([
    [1, '2026-09-20T10:00:00Z'],
    [2, '2026-09-24T10:00:00Z'],
    [3, '2026-09-28T10:00:00Z'],
  ])
  const sets = [set(1, 1, 55, 8), set(2, 2, 60, 7), set(2, 1, 60, 8), set(3, 1, 62.5, 6)]

  it('returns the most recent earlier session, ordered by set', () => {
    expect(lastSessionSets(sets, order, 3)).toEqual([set(2, 1, 60, 8), set(2, 2, 60, 7)])
  })

  it('ignores sessions that are not in the order map (e.g. unfinished)', () => {
    expect(lastSessionSets(sets, new Map([[1, '2026-09-20T10:00:00Z']]))).toEqual([set(1, 1, 55, 8)])
  })

  it('is empty the first time', () => {
    expect(lastSessionSets([], order)).toEqual([])
  })

  it('pre-fills from the same set, else the last set', () => {
    const last = [set(2, 1, 60, 8), set(2, 2, 60, 7)]
    expect(prefillSet(2, last)).toEqual({ weightKg: 60, reps: 7 })
    expect(prefillSet(3, last)).toEqual({ weightKg: 60, reps: 7 })
    expect(prefillSet(1, [])).toBeNull()
  })

  it('labels last time, including bodyweight', () => {
    expect(lastTimeLabel({ weightKg: 60, reps: 8 })).toBe('60 kg × 8')
    expect(lastTimeLabel({ weightKg: 0, reps: 10 }, true)).toBe('BW × 10')
    expect(formatWeight(5, true)).toBe('BW + 5 kg')
  })
})

describe('summarize', () => {
  it('counts sets, volume and duration', () => {
    const s = summarize([set(1, 1, 60, 8), set(1, 2, 60, 6), { weightKg: 0, reps: 12 }], '2026-09-30T10:00:00Z', '2026-09-30T11:05:30Z')
    expect(s).toEqual({ totalSets: 3, volumeKg: 840, durationSec: 3930 })
  })
})

describe('timers and formatting', () => {
  it('counts rest down in whole seconds, never below zero', () => {
    expect(restRemaining(10_000, 8_200)).toBe(2)
    expect(restRemaining(10_000, 12_000)).toBe(0)
  })

  it('formats clocks, rests and rep ranges', () => {
    expect(formatClock(95)).toBe('1:35')
    expect(formatClock(3930)).toBe('1:05:30')
    expect(formatRest(90)).toBe('1.5 min')
    expect(formatRest(180)).toBe('3 min')
    expect(formatRest(45)).toBe('45 s')
    expect(formatRepRange([6, 8])).toBe('6–8')
    expect(formatRepRange([10, 10])).toBe('10')
  })

  it('does not rest between the exercises of a superset', () => {
    const plan = planForMode(SPLIT[3]!, 'gym')
    const first = plan.findIndex((p) => p.superset === 'upper-arms')
    expect(restAfter(plan, first)).toBe(false)
    expect(restAfter(plan, first + 1)).toBe(true)
    expect(restAfter(plan, 0)).toBe(true)
  })
})

describe('template editing helpers', () => {
  it('suggests swaps that train the same muscle and fit the mode', () => {
    const bench = byId.get('barbell-bench-press')!
    const gym = swapCandidates(bench, EXERCISES, 'gym').map((e) => e.id)
    expect(gym.slice(0, 3)).toEqual(expect.arrayContaining(['incline-barbell-press', 'incline-db-press']))
    expect(gym).not.toContain('barbell-bench-press')
    expect(gym).not.toContain('lat-pulldown')
    const home = swapCandidates(bench, EXERCISES, 'home').map((e) => e.id)
    expect(home).toContain('db-floor-press')
    expect(home).not.toContain('machine-chest-press')
  })

  it('moves items within bounds', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, -2)).toEqual(['c', 'a', 'b'])
  })

  it('makes fresh keys', () => {
    expect(newTemplateKey(SPLIT[0]!)).toBe('push-7')
    expect(newTemplateKey({ name: 'Push', exercises: [{ key: 'push-2' } as never] })).toBe('push-3')
  })
})
