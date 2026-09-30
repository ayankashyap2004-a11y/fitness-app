// Workout domain: pure functions only (no React, no Dexie).

export type TrainingMode = 'gym' | 'home'

export type Muscle =
  | 'chest'
  | 'back'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'

export interface ExerciseDef {
  id: string
  name: string
  /** Where it can be done. 'both' works at the gym and at home. */
  equipment: TrainingMode | 'both'
  kind: 'compound' | 'isolation'
  /** Weight is optional added load (push-ups, pull-ups). */
  bodyweight?: boolean
  /** Reps are counted per leg/arm. */
  perSide?: boolean
  muscles: { primary: Muscle[]; secondary: Muscle[] }
  howTo: string[]
  cues: string[]
  mistakes: string[]
}

export interface TemplateExercise {
  /** Stable within the day; survives reorders and swaps. */
  key: string
  gymId: string
  homeId: string
  gymNote?: string
  homeNote?: string
  sets: number
  repRange: [number, number]
  rir: string
  restSec: number
  /** Entries sharing a group id are done back to back. */
  superset?: string
}

export interface DayTemplate {
  dayIndex: number
  name: string
  focus: string
  exercises: TemplateExercise[]
}

/** A template entry resolved for one session's mode; snapshotted into the session. */
export interface PlannedExercise {
  key: string
  exerciseId: string
  note?: string
  sets: number
  repRange: [number, number]
  rir: string
  restSec: number
  superset?: string
}

export interface LoggedSet {
  sessionId: number
  exerciseId: string
  setNo: number
  weightKg: number
  reps: number
  rir?: number
}

export function availableIn(ex: Pick<ExerciseDef, 'equipment'>, mode: TrainingMode): boolean {
  return ex.equipment === 'both' || ex.equipment === mode
}

export function planForMode(day: DayTemplate, mode: TrainingMode): PlannedExercise[] {
  return day.exercises.map((e) => ({
    key: e.key,
    exerciseId: mode === 'gym' ? e.gymId : e.homeId,
    note: mode === 'gym' ? e.gymNote : e.homeNote,
    sets: e.sets,
    repRange: e.repRange,
    rir: e.rir,
    restSec: e.restSec,
    superset: e.superset,
  }))
}

/** Days run in a rotation, not on fixed weekdays. */
export function nextDayIndex(current: number, totalDays: number): number {
  return (current + 1) % totalDays
}

/**
 * Sets from the most recent earlier session that included this exercise,
 * ordered by set number. `sessionOrder` maps session id → start time (ISO).
 */
export function lastSessionSets<T extends LoggedSet>(
  sets: readonly T[],
  sessionOrder: ReadonlyMap<number, string>,
  excludeSessionId?: number,
): T[] {
  let latest: number | undefined
  for (const s of sets) {
    if (s.sessionId === excludeSessionId || !sessionOrder.has(s.sessionId)) continue
    if (latest === undefined || sessionOrder.get(s.sessionId)! > sessionOrder.get(latest)!) latest = s.sessionId
  }
  return latest === undefined ? [] : sets.filter((s) => s.sessionId === latest).sort((a, b) => a.setNo - b.setNo)
}

/** Pre-fill from the same set last time, else that session's last set. */
export function prefillSet(setNo: number, last: readonly LoggedSet[]): { weightKg: number; reps: number } | null {
  const same = last.find((s) => s.setNo === setNo) ?? last[last.length - 1]
  return same ? { weightKg: same.weightKg, reps: same.reps } : null
}

export function formatWeight(kg: number, bodyweight = false): string {
  if (bodyweight) return kg > 0 ? `BW + ${kg} kg` : 'BW'
  return `${kg} kg`
}

/** 'Last time: 60 kg × 8' (display only; no suggestions). */
export function lastTimeLabel(s: Pick<LoggedSet, 'weightKg' | 'reps'>, bodyweight = false): string {
  return `${formatWeight(s.weightKg, bodyweight)} × ${s.reps}`
}

export interface SessionSummary {
  totalSets: number
  /** Σ weight × reps; bodyweight-only sets add 0. */
  volumeKg: number
  durationSec: number
}

export function summarize(sets: readonly Pick<LoggedSet, 'weightKg' | 'reps'>[], startedAt: string, endedAt: string): SessionSummary {
  return {
    totalSets: sets.length,
    volumeKg: Math.round(sets.reduce((v, s) => v + s.weightKg * s.reps, 0)),
    durationSec: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000)),
  }
}

export function restRemaining(endsAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000))
}

/** 95 → '1:35' */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** 90 → '1.5 min', 60 → '1 min', 45 → '45 s' */
export function formatRest(sec: number): string {
  if (sec < 60) return `${sec} s`
  const min = Math.round((sec / 60) * 10) / 10
  return `${min} min`
}

export function formatRepRange([lo, hi]: readonly [number, number]): string {
  return lo === hi ? String(lo) : `${lo}–${hi}`
}

/**
 * Whether the rest timer should start after a set of `index`: not between the
 * exercises of a superset, only after the last one in the group.
 */
export function restAfter(plan: readonly Pick<PlannedExercise, 'superset'>[], index: number): boolean {
  const group = plan[index]?.superset
  if (!group) return true
  const next = plan[index + 1]
  return next?.superset !== group
}

/** Exercises that could replace `target`, available in `mode`, best matches first. */
export function swapCandidates(target: ExerciseDef, library: readonly ExerciseDef[], mode: TrainingMode): ExerciseDef[] {
  const score = (e: ExerciseDef) => {
    const primary = e.muscles.primary.filter((m) => target.muscles.primary.includes(m)).length
    const any = [...e.muscles.primary, ...e.muscles.secondary].filter((m) =>
      [...target.muscles.primary, ...target.muscles.secondary].includes(m),
    ).length
    return primary * 10 + any + (e.kind === target.kind ? 1 : 0)
  }
  return library
    .filter((e) => e.id !== target.id && availableIn(e, mode))
    .map((e) => ({ e, s: score(e) }))
    .filter((x) => x.s >= 10)
    .sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name))
    .map((x) => x.e)
}

/** Moves an item by `delta` places, clamped to the list. Returns a new array. */
export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const to = Math.min(list.length - 1, Math.max(0, index + delta))
  if (to === index) return [...list]
  const copy = [...list]
  const [item] = copy.splice(index, 1)
  copy.splice(to, 0, item!)
  return copy
}

/** A key not used in the day, e.g. 'push-7'. */
export function newTemplateKey(day: Pick<DayTemplate, 'name' | 'exercises'>): string {
  const base = day.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const taken = new Set(day.exercises.map((e) => e.key))
  let n = day.exercises.length + 1
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
