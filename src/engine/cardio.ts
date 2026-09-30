import { addDays } from './dates'

export type CardioType = 'walk' | 'run' | 'pickleball' | 'cycle' | 'swim' | 'sport' | 'other'

export const CARDIO_TYPES: readonly CardioType[] = ['walk', 'run', 'pickleball', 'cycle', 'swim', 'sport', 'other']

/** Walk and run take treadmill-style speed and incline. */
export const SPEED_TYPES: readonly CardioType[] = ['walk', 'run']

export type PickleballIntensity = 'doubles' | 'singles'

export interface CardioLite {
  date: string
  durationMin: number
  distanceKm?: number
  kcalEstimate?: number
}

export interface CardioWeek {
  sessions: number
  minutes: number
  km: number
  /** Sum of saved estimates (display only). */
  kcal: number
}

/**
 * Cardio totals for the week starting `weekStartIso`. Display only: cardio calories are
 * never added to the daily target (the activity level already covers them).
 */
export function cardioWeek(logs: readonly CardioLite[], weekStartIso: string): CardioWeek {
  const end = addDays(weekStartIso, 6)
  const inWeek = logs.filter((l) => l.date >= weekStartIso && l.date <= end)
  return {
    sessions: inWeek.length,
    minutes: Math.round(inWeek.reduce((s, l) => s + l.durationMin, 0)),
    km: Math.round(inWeek.reduce((s, l) => s + (l.distanceKm ?? 0), 0) * 10) / 10,
    kcal: Math.round(inWeek.reduce((s, l) => s + (l.kcalEstimate ?? 0), 0)),
  }
}

export const CARDIO_LIMITS = {
  durationMin: [1, 600],
  distanceKm: [0, 300],
  speedKmh: [1, 25],
  inclinePct: [0, 20],
} as const

export interface CardioDraftErrors {
  durationMin?: string
  distanceKm?: string
  speedKmh?: string
  inclinePct?: string
}

export function validateCardio(
  durationMin: number,
  distanceKm: number | undefined,
  speedKmh?: number,
  inclinePct?: number,
): CardioDraftErrors {
  const errors: CardioDraftErrors = {}
  const outside = (v: number, [lo, hi]: readonly [number, number]) => !Number.isFinite(v) || v < lo || v > hi
  const L = CARDIO_LIMITS
  if (outside(durationMin, L.durationMin)) errors.durationMin = `Enter ${L.durationMin[0]}–${L.durationMin[1]} minutes`
  if (distanceKm !== undefined && outside(distanceKm, L.distanceKm)) errors.distanceKm = `Enter 0–${L.distanceKm[1]} km`
  if (speedKmh !== undefined && outside(speedKmh, L.speedKmh)) errors.speedKmh = `Enter ${L.speedKmh[0]}–${L.speedKmh[1]} km/h`
  if (inclinePct !== undefined && outside(inclinePct, L.inclinePct)) errors.inclinePct = `Enter ${L.inclinePct[0]}–${L.inclinePct[1]} %`
  return errors
}

// Calories burned: an estimate for display only. Never added to the calorie target.

/** 1 litre of O2 ≈ 5 kcal (ACSM). */
const KCAL_PER_L_O2 = 5
/** Resting VO2 in ml/kg/min (1 MET). */
const REST_VO2 = 3.5

/**
 * ACSM metabolic equations for treadmill walking and running (gross VO2, ml/kg/min).
 * Running: 0.2·v + 0.9·v·grade + 3.5 (jogging/running pace).
 * Walking: 0.1·v + 1.8·v·grade + 3.5 (about 3–6 km/h).
 * v in m/min; grade as a fraction (5 % → 0.05).
 */
export function acsmVO2(type: 'walk' | 'run', speedKmh: number, inclinePct = 0): number {
  const v = (speedKmh * 1000) / 60
  const grade = inclinePct / 100
  return type === 'run' ? 0.2 * v + 0.9 * v * grade + REST_VO2 : 0.1 * v + 1.8 * v * grade + REST_VO2
}

export function kcalFromVO2(vo2: number, weightKg: number, minutes: number): number {
  return ((vo2 * weightKg) / 1000) * KCAL_PER_L_O2 * minutes
}

/** kcal/min = MET × 3.5 × kg / 200. */
export function kcalFromMET(met: number, weightKg: number, minutes: number): number {
  return ((met * REST_VO2 * weightKg) / 200) * minutes
}

/**
 * Pickleball METs. 4.1 is the measured average (Smith et al. 2018, Int J Res Exerc Physiol;
 * range 1.5–7.7), also reported as the 2024 Compendium value for social doubles; 5.8 is
 * the reported competitive-singles value.
 */
export const PICKLEBALL_METS: Record<PickleballIntensity, number> = { doubles: 4.1, singles: 5.8 }

export interface CardioEstimateInput {
  type: CardioType
  durationMin: number
  distanceKm?: number
  speedKmh?: number
  inclinePct?: number
  intensity?: PickleballIntensity
}

/**
 * Estimated kcal burned, or null when there isn't enough to go on: walk/run need a speed
 * (or a distance to derive one); other types have no estimate yet.
 */
export function estimateCardioKcal(c: CardioEstimateInput, weightKg: number | undefined): number | null {
  if (!weightKg || !(c.durationMin > 0)) return null
  if (c.type === 'walk' || c.type === 'run') {
    const speed = c.speedKmh ?? (c.distanceKm ? (c.distanceKm / c.durationMin) * 60 : undefined)
    if (!speed) return null
    return Math.round(kcalFromVO2(acsmVO2(c.type, speed, c.inclinePct ?? 0), weightKg, c.durationMin))
  }
  if (c.type === 'pickleball') return Math.round(kcalFromMET(PICKLEBALL_METS[c.intensity ?? 'doubles'], weightKg, c.durationMin))
  return null
}
