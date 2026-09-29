import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, toISODate } from '../engine/dates'
import { computeTargets, type Targets } from '../engine/targets'
import { sevenDayAverage, type AverageWeight } from '../engine/trends'
import type { Macros } from '../engine/types'
import { db } from './schema'
import type { Profile } from './types'

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
  return useLiveQuery(async () => {
    const entries = await db.foodLog.where('date').equals(date).toArray()
    return entries.reduce<Macros>(
      (sum, e) => ({
        kcal: sum.kcal + e.macros.kcal,
        protein: sum.protein + e.macros.protein,
        carbs: sum.carbs + e.macros.carbs,
        fat: sum.fat + e.macros.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }, [date])
}
