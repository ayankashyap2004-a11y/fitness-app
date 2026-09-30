// Dinner summary from what was actually logged. Never predicted from a menu: the app
// doesn't assume what the user will eat.

export interface LoggedItem {
  name: string
  protein: number
}

export interface DinnerSummary {
  /** The logged item with the most protein. */
  main: LoggedItem
  /** Total protein across all dinner entries. */
  protein: number
}

/** Null until something is logged at dinner. */
export function dinnerSummary(items: readonly LoggedItem[]): DinnerSummary | null {
  if (items.length === 0) return null
  const main = items.reduce((best, i) => (i.protein > best.protein ? i : best))
  const protein = Math.round(items.reduce((s, i) => s + i.protein, 0) * 10) / 10
  return { main, protein }
}

/** Protein still to eat today; never negative. */
export function proteinLeft(target: number, eatenToday: number): number {
  return Math.max(0, Math.round(target - eatenToday))
}
