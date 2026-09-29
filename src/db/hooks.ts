import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, toISODate } from '../engine/dates'
import { resolveFood, sumMacros, type FoodView } from '../engine/food'
import { computeTargets, type Targets } from '../engine/targets'
import { sevenDayAverage, type AverageWeight } from '../engine/trends'
import type { Macros } from '../engine/types'
import { db } from './schema'
import type { FoodLogEntry, MealSlot, PinnedItem, Profile } from './types'

export function useToday(): string {
  return toISODate(new Date())
}

/** undefined while loading, null when onboarding hasn't happened. */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await db.profile.get(1)) ?? null)
}

export type TargetsState =
  | { status: 'loading' }
  | { status: 'no-profile' }
  | { status: 'no-weight'; profile: Profile }
  | { status: 'ready'; profile: Profile; weight: AverageWeight; latestKg: number; targets: Targets }

/** Live targets: recompute whenever the profile or a weigh-in changes. */
export function useTargets(today: string): TargetsState {
  const data = useLiveQuery(async () => {
    const profile = await db.profile.get(1)
    // Enough history for the 7-day window plus a stale fallback.
    const logs = await db.weightLogs.where('date').between(addDays(today, -60), today, true, true).toArray()
    if (logs.length === 0) {
      const last = await db.weightLogs.where('date').belowOrEqual(today).last()
      if (last) logs.push(last)
    }
    return { profile, logs }
  }, [today])

  if (!data) return { status: 'loading' }
  const { profile, logs } = data
  if (!profile) return { status: 'no-profile' }

  const weight = sevenDayAverage(logs, today)
  if (!weight) return { status: 'no-weight', profile }

  const latest = logs.reduce((a, b) => (a.date > b.date ? a : b))
  const targets = computeTargets({ ...profile, weightKg: weight.weightKg, today })
  return { status: 'ready', profile, weight, latestKg: latest.weightKg, targets }
}

export function useConsumed(date: string): Macros | undefined {
  return useLiveQuery(async () => sumMacros((await db.foodLog.where('date').equals(date).toArray()).map((e) => e.macros)), [date])
}

export interface FoodLibrary {
  foods: FoodView[]
  byId: Map<string, FoodView>
}

/** Every food merged with its archetype. Re-resolves when a dish or archetype changes. */
export function useFoodLibrary(): FoodLibrary | undefined {
  return useLiveQuery(async () => {
    const [items, archetypes] = await Promise.all([db.foodItems.toArray(), db.archetypes.toArray()])
    const arch = new Map(archetypes.map((a) => [a.id, a]))
    const foods: FoodView[] = []
    for (const item of items) {
      const view = resolveFood(item, item.archetypeId ? arch.get(item.archetypeId) : undefined)
      if (view) foods.push(view)
    }
    return { foods, byId: new Map(foods.map((f) => [f.id, f])) }
  })
}

export function useDayLog(date: string): FoodLogEntry[] | undefined {
  return useLiveQuery(() => db.foodLog.where('date').equals(date).sortBy('createdAt'), [date])
}

export function usePinned(): PinnedItem[] | undefined {
  return useLiveQuery(() => db.pinnedItems.toArray())
}

/** Foods logged in this slot over the last 30 days, most frequent first. */
export function useRecentInSlot(slot: MealSlot, today: string): string[] | undefined {
  return useLiveQuery(async () => {
    const entries = await db.foodLog.where('date').between(addDays(today, -30), today, true, true).toArray()
    const stats = new Map<string, { n: number; last: string }>()
    for (const e of entries) {
      if (e.mealSlot !== slot) continue
      const s = stats.get(e.foodId) ?? { n: 0, last: '' }
      stats.set(e.foodId, { n: s.n + 1, last: e.createdAt > s.last ? e.createdAt : s.last })
    }
    return [...stats.entries()].sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last)).map(([id]) => id)
  }, [slot, today])
}

export type MenuForDay = Partial<Record<MealSlot, string[]>>

/** Imported mess menu for one date, by slot. Empty object if none. */
export function useMenuDay(date: string): MenuForDay | undefined {
  return useLiveQuery(async () => {
    const rows = await db.menuDays.where('date').equals(date).toArray()
    return Object.fromEntries(rows.map((r) => [r.slot, r.foodIds])) as MenuForDay
  }, [date])
}

/** First and last dates with an imported menu, or null. */
export function useMenuRange(): { first: string; last: string } | null | undefined {
  return useLiveQuery(async () => {
    const first = await db.menuDays.orderBy('date').first()
    const last = await db.menuDays.orderBy('date').last()
    return first && last ? { first: first.date, last: last.date } : null
  })
}
