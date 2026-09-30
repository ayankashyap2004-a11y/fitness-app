import { toISODate } from '../engine/dates'
import { lastSessionSets, nextDayIndex, planForMode, type TrainingMode } from '../engine/workout'
import type { FitnessDB } from './schema'
import { SEED } from './seed'
import type { SetLog, WorkoutSession, WorkoutTemplate } from './types'

export async function activeSession(db: FitnessDB): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.filter((s) => !s.completed).first()
}

/** Starts the given day. If a session is already running, returns it instead of starting another. */
export async function startSession(db: FitnessDB, dayIndex: number, mode: TrainingMode, now = new Date()): Promise<number> {
  return db.transaction('rw', db.workoutSessions, db.workoutTemplates, async () => {
    const running = await activeSession(db)
    if (running?.id !== undefined) return running.id
    const day = await db.workoutTemplates.get(dayIndex)
    if (!day) throw new Error(`No template for day ${dayIndex}`)
    const session: WorkoutSession = {
      date: toISODate(now),
      templateDay: dayIndex,
      dayName: day.name,
      mode,
      startedAt: now.toISOString(),
      isDeload: false,
      completed: false,
      plan: planForMode(day, mode),
    }
    return (await db.workoutSessions.add(session)) as number
  })
}

export interface SetInput {
  sessionId: number
  planKey: string
  exerciseId: string
  setNo: number
  weightKg: number
  reps: number
  rir?: number
}

/** Logs a set, or updates it if that set number was already logged. */
export async function logSet(db: FitnessDB, input: SetInput, now = new Date()): Promise<number> {
  return db.transaction('rw', db.setLogs, async () => {
    const existing = await db.setLogs
      .where('sessionId')
      .equals(input.sessionId)
      .filter((s) => s.planKey === input.planKey && s.setNo === input.setNo)
      .first()
    const row: SetLog = { ...input, loggedAt: existing?.loggedAt ?? now.toISOString() }
    if (existing?.id !== undefined) {
      await db.setLogs.put({ ...row, id: existing.id })
      return existing.id
    }
    return (await db.setLogs.add(row)) as number
  })
}

export async function deleteSet(db: FitnessDB, id: number) {
  await db.setLogs.delete(id)
}

/** '+ Set': one more set than planned for this session only. */
export async function addPlannedSet(db: FitnessDB, sessionId: number, planKey: string) {
  await db.transaction('rw', db.workoutSessions, async () => {
    const s = await db.workoutSessions.get(sessionId)
    if (!s) return
    await db.workoutSessions.update(sessionId, { plan: s.plan.map((p) => (p.key === planKey ? { ...p, sets: p.sets + 1 } : p)) })
  })
}

export async function setExerciseNote(db: FitnessDB, sessionId: number, planKey: string, note: string) {
  await db.transaction('rw', db.workoutSessions, async () => {
    const s = await db.workoutSessions.get(sessionId)
    if (!s) return
    const notes = { ...s.notes }
    if (note.trim()) notes[planKey] = note
    else delete notes[planKey]
    await db.workoutSessions.update(sessionId, { notes })
  })
}

/** Completes the session and moves the rotation to the next day. */
export async function finishSession(db: FitnessDB, sessionId: number, now = new Date()) {
  await db.transaction('rw', db.workoutSessions, db.workoutTemplates, db.appMeta, async () => {
    const s = await db.workoutSessions.get(sessionId)
    if (!s || s.completed) return
    const endedAt = now.toISOString()
    await db.workoutSessions.update(sessionId, {
      completed: true,
      endedAt,
      durationSec: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(s.startedAt)) / 1000)),
    })
    const days = await db.workoutTemplates.count()
    await db.appMeta.update(1, { splitPointer: nextDayIndex(s.templateDay, days) })
  })
}

/** Throws away an unfinished session and its sets. The rotation doesn't move. */
export async function discardSession(db: FitnessDB, sessionId: number) {
  await db.transaction('rw', db.workoutSessions, db.setLogs, async () => {
    await db.setLogs.where('sessionId').equals(sessionId).delete()
    await db.workoutSessions.delete(sessionId)
  })
}

/** Sets from the last completed session that included each exercise. */
export async function lastTimeFor(db: FitnessDB, exerciseIds: readonly string[], excludeSessionId?: number): Promise<Map<string, SetLog[]>> {
  const completed = await db.workoutSessions.filter((s) => s.completed).toArray()
  const order = new Map(completed.map((s) => [s.id!, s.startedAt]))
  const out = new Map<string, SetLog[]>()
  for (const id of new Set(exerciseIds)) {
    const sets = await db.setLogs.where('exerciseId').equals(id).toArray()
    out.set(id, lastSessionSets(sets, order, excludeSessionId))
  }
  return out
}

export async function saveTemplate(db: FitnessDB, day: WorkoutTemplate) {
  await db.workoutTemplates.put(day)
}

export async function resetTemplate(db: FitnessDB, dayIndex: number) {
  const original = SEED.split.find((d) => d.dayIndex === dayIndex)
  if (original) await db.workoutTemplates.put(structuredClone(original))
}
