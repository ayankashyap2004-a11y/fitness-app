import type { WeekSummary } from '../../db/week'
import type { Muscle } from '../../engine/workout'
import { MUSCLE_LABELS } from './labels'

/** The muscles in the PRD §4.4 weekly volume table, in its order. */
const MUSCLES: Muscle[] = ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs']

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** This week's sessions, cardio and fractional sets per muscle vs. the plan. Display only. */
export function WeekCard({ week }: { week: WeekSummary }) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium">This week</h2>
        <span className="text-xs text-muted">
          from {new Date(`${week.weekStart}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-surface py-2">
          <p className="text-lg font-semibold tabular-nums">{week.sessionsDone}</p>
          <p className="text-xs text-muted">workouts</p>
        </div>
        <div className="rounded-xl bg-surface py-2">
          <p className="text-lg font-semibold tabular-nums">{week.cardio.minutes} min</p>
          <p className="text-xs text-muted">
            cardio{week.cardio.km > 0 ? ` · ${week.cardio.km} km` : ''}
            {week.cardio.kcal > 0 ? ` · ≈${week.cardio.kcal} kcal` : ''}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-muted">
          Sets per muscle (helper muscles count half){week.deload.state === 'due' || week.deload.state === 'active' ? ' · deload plan' : ''}
        </p>
        <ul className="space-y-1.5">
          {MUSCLES.map((m) => {
            const done = week.actual[m] ?? 0
            const plan = week.planned[m] ?? 0
            const pct = plan > 0 ? Math.min(100, (done / plan) * 100) : done > 0 ? 100 : 0
            return (
              <li key={m} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-2 text-sm">
                <span className="truncate capitalize text-muted">{MUSCLE_LABELS[m]}</span>
                <span className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`${MUSCLE_LABELS[m]} sets`} aria-valuenow={done} aria-valuemax={plan}>
                  <span className={`block h-full rounded-full ${done >= plan && plan > 0 ? 'bg-accent' : 'bg-protein'}`} style={{ width: `${pct}%` }} />
                </span>
                <span className="text-right tabular-nums">
                  {fmt(done)}
                  <span className="text-muted"> / {fmt(plan)}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
