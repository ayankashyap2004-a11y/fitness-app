import type { Muscle } from './workout'

/** Fractional set counting (PRD §4.4): a direct set counts 1, a helper-muscle set 0.5. */
export const HELPER_SET_WEIGHT = 0.5

export interface VolumeItem {
  muscles: { primary: Muscle[]; secondary: Muscle[] }
  sets: number
}

export function fractionalVolume(items: readonly VolumeItem[]): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {}
  for (const { muscles, sets } of items) {
    for (const m of muscles.primary) out[m] = (out[m] ?? 0) + sets
    for (const m of muscles.secondary) out[m] = (out[m] ?? 0) + sets * HELPER_SET_WEIGHT
  }
  return out
}

export interface MuscleLookup {
  (exerciseId: string): { primary: Muscle[]; secondary: Muscle[] } | undefined
}

/**
 * The week's planned volume from the split (gym versions, as in PRD §4.4). In a deload
 * week, pass the halving function so the plan matches what's actually prescribed.
 */
export function plannedWeekly(
  days: readonly { exercises: readonly { gymId: string; sets: number }[] }[],
  muscles: MuscleLookup,
  adjustSets: (sets: number) => number = (s) => s,
): Partial<Record<Muscle, number>> {
  const items: VolumeItem[] = []
  for (const d of days)
    for (const e of d.exercises) {
      const m = muscles(e.gymId)
      if (m) items.push({ muscles: m, sets: adjustSets(e.sets) })
    }
  return fractionalVolume(items)
}

/** The week's actual volume: every logged set counts once for its exercise. */
export function actualWeekly(sets: readonly { exerciseId: string }[], muscles: MuscleLookup): Partial<Record<Muscle, number>> {
  const items: VolumeItem[] = []
  for (const s of sets) {
    const m = muscles(s.exerciseId)
    if (m) items.push({ muscles: m, sets: 1 })
  }
  return fractionalVolume(items)
}
