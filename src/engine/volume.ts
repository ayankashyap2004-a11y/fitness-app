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
