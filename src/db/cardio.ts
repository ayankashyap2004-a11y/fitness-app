import type { FitnessDB } from './schema'
import type { CardioLog } from './types'

export type CardioInput = Omit<CardioLog, 'id'>

/** Cardio is logged for the weekly summary only; it never changes calorie targets. */
export async function addCardio(db: FitnessDB, c: CardioInput): Promise<number> {
  return (await db.cardioLogs.add(clean(c))) as number
}

export async function updateCardio(db: FitnessDB, id: number, c: CardioInput) {
  await db.cardioLogs.put({ ...clean(c), id })
}

export async function deleteCardio(db: FitnessDB, id: number) {
  await db.cardioLogs.delete(id)
}

/** Drops empty optional fields, and fields that don't apply to the type. */
function clean(c: CardioInput): CardioInput {
  const note = c.note?.trim()
  const treadmill = c.type === 'walk' || c.type === 'run'
  return {
    date: c.date,
    type: c.type,
    durationMin: c.durationMin,
    ...(c.distanceKm !== undefined ? { distanceKm: c.distanceKm } : {}),
    ...(treadmill && c.speedKmh !== undefined ? { speedKmh: c.speedKmh } : {}),
    ...(treadmill && c.inclinePct !== undefined ? { inclinePct: c.inclinePct } : {}),
    ...(c.type === 'pickleball' && c.intensity ? { intensity: c.intensity } : {}),
    ...(c.kcalEstimate !== undefined ? { kcalEstimate: c.kcalEstimate } : {}),
    ...(note ? { note } : {}),
  }
}
