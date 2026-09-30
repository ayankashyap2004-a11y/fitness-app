import { addDays } from '../engine/dates'
import { cardioWeek, type CardioWeek } from '../engine/cardio'
import { deloadSets, isDeloadWeek, type DeloadStatus } from '../engine/deload'
import { actualWeekly, plannedWeekly } from '../engine/volume'
import type { Muscle } from '../engine/workout'
import { getDeloadStatus } from './deload'
import type { FitnessDB } from './schema'

export interface WeekSummary {
  weekStart: string
  sessionsDone: number
  cardio: CardioWeek
  actual: Partial<Record<Muscle, number>>
  planned: Partial<Record<Muscle, number>>
  deload: DeloadStatus
}

/** This Monday–Sunday week: sessions, cardio and fractional volume vs. plan (display only). */
export async function weekSummary(db: FitnessDB, today: string): Promise<WeekSummary> {
  const deload = await getDeloadStatus(db, today)
  const start = deload.week
  const end = addDays(start, 6)

  const [sessions, templates, exercises, cardio] = await Promise.all([
    db.workoutSessions.where('date').between(start, end, true, true).toArray(),
    db.workoutTemplates.toArray(),
    db.exercises.toArray(),
    db.cardioLogs.where('date').between(start, end, true, true).toArray(),
  ])
  const byId = new Map(exercises.map((e) => [e.id, e.muscles]))
  const lookup = (id: string) => byId.get(id)

  // Count sets from sessions in progress too, so the view updates while training.
  const ids = sessions.map((s) => s.id!)
  const sets = ids.length > 0 ? await db.setLogs.where('sessionId').anyOf(ids).toArray() : []

  return {
    weekStart: start,
    sessionsDone: sessions.filter((s) => s.completed).length,
    cardio: cardioWeek(cardio, start),
    actual: actualWeekly(sets, lookup),
    planned: plannedWeekly(templates, lookup, isDeloadWeek(deload) ? deloadSets : undefined),
    deload,
  }
}
