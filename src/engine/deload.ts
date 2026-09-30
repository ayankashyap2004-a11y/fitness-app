import { addDays } from './dates'

/** PRD §4.4: a deload every 6 completed training weeks (a practical default, not a researched optimum). */
export const DELOAD_EVERY_WEEKS = 6
/** A Monday–Sunday week counts as training only with at least this many completed sessions. */
export const MIN_SESSIONS_PER_TRAINING_WEEK = 3

/** Monday of the week containing `iso` ('YYYY-MM-DD'). */
export function weekStart(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const day = new Date(y!, m! - 1, d!).getDay() // 0 = Sunday
  return addDays(iso, -((day + 6) % 7))
}

/** Half the planned sets, rounded up, never below 1 (3 → 2, 4 → 2, 1 → 1). */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.ceil(sets / 2))
}

export interface SessionLite {
  date: string
  completed: boolean
  isDeload: boolean
}

export type DeloadState =
  /** Counting toward the next deload. */
  | 'normal'
  /** 6+ training weeks done: this week should be a deload. */
  | 'due'
  /** Due, but skipped for this week. */
  | 'skipped'
  /** Deload sessions already done this week: keep deloading until the week ends. */
  | 'active'

export interface DeloadStatus {
  state: DeloadState
  /** Completed training weeks since the last deload week (the current week isn't counted yet). */
  trainingWeeks: number
  week: string
}

/**
 * Derived from session history, so it can't drift: counts completed training weeks after
 * the last week that had a deload session, up to (not including) the current week.
 */
export function deloadStatus(
  sessions: readonly SessionLite[],
  today: string,
  skippedWeek?: string,
  every = DELOAD_EVERY_WEEKS,
  minSessions = MIN_SESSIONS_PER_TRAINING_WEEK,
): DeloadStatus {
  const week = weekStart(today)
  const deloadWeeks = new Set(sessions.filter((s) => s.isDeload).map((s) => weekStart(s.date)))
  const lastDeload = [...deloadWeeks].filter((w) => w < week).sort().pop() ?? ''

  const perWeek = new Map<string, number>()
  for (const s of sessions) {
    if (!s.completed || s.isDeload) continue
    const w = weekStart(s.date)
    if (w > lastDeload && w < week) perWeek.set(w, (perWeek.get(w) ?? 0) + 1)
  }
  const trainingWeeks = [...perWeek.values()].filter((n) => n >= minSessions).length

  let state: DeloadState = 'normal'
  if (deloadWeeks.has(week)) state = 'active'
  else if (trainingWeeks >= every) state = skippedWeek === week ? 'skipped' : 'due'
  return { state, trainingWeeks, week }
}

/** New sessions this week are deloads when one is due or already under way. */
export function isDeloadWeek(status: Pick<DeloadStatus, 'state'>): boolean {
  return status.state === 'due' || status.state === 'active'
}
