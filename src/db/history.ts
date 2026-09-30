import type { FitnessDB } from './schema'
import type { SetLog, WorkoutSession } from './types'

export interface HistoryEntry {
  session: WorkoutSession
  sets: SetLog[]
}

/** Every completed session that included this exercise, newest first, with its sets in order. */
export async function exerciseHistory(db: FitnessDB, exerciseId: string): Promise<HistoryEntry[]> {
  const sets = await db.setLogs.where('exerciseId').equals(exerciseId).toArray()
  const bySession = new Map<number, SetLog[]>()
  for (const s of sets) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s])
  const sessions = (await db.workoutSessions.bulkGet([...bySession.keys()])).filter((s): s is WorkoutSession => !!s?.completed)
  return sessions
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((session) => ({ session, sets: bySession.get(session.id!)!.sort((a, b) => a.setNo - b.setNo) }))
}

/** Exercise ids with at least one set in a completed session, most recently trained first. */
export async function trainedExercises(db: FitnessDB): Promise<string[]> {
  const completed = new Map((await db.workoutSessions.filter((s) => s.completed).toArray()).map((s) => [s.id!, s.startedAt]))
  const latest = new Map<string, string>()
  for (const s of await db.setLogs.toArray()) {
    const at = completed.get(s.sessionId)
    if (at && (latest.get(s.exerciseId) ?? '') < at) latest.set(s.exerciseId, at)
  }
  return [...latest.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => id)
}
