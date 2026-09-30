import { deloadStatus, weekStart, type DeloadStatus } from '../engine/deload'
import type { FitnessDB } from './schema'

export async function getDeloadStatus(db: FitnessDB, today: string): Promise<DeloadStatus> {
  const [sessions, meta] = await Promise.all([db.workoutSessions.toArray(), db.appMeta.get(1)])
  return deloadStatus(sessions, today, meta?.deloadSkippedWeek)
}

/** 'Skip': push the deload back one week. It comes back next week if still due. */
export async function skipDeload(db: FitnessDB, today: string) {
  await db.appMeta.update(1, { deloadSkippedWeek: weekStart(today) })
}

/** Undo a skip made this week. */
export async function unskipDeload(db: FitnessDB) {
  await db.appMeta.update(1, { deloadSkippedWeek: undefined })
}
