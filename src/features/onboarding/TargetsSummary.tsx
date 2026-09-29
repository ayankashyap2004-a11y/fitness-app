import { TargetNotes } from '../../components/TargetNotes'
import type { Targets } from '../../engine/targets'

/** The calculated numbers, with the working shown. */
export function TargetsSummary({ targets }: { targets: Targets }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-sm text-muted">Daily calories</p>
        <p className="text-4xl font-semibold tabular-nums">
          {targets.kcal}
          <span className="ml-1 text-lg font-normal text-muted">kcal</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Protein" value={targets.protein} highlight />
          <Stat label="Carbs" value={targets.carbs} />
          <Stat label="Fat" value={targets.fat} />
        </div>
      </div>

      <dl className="space-y-1.5 rounded-2xl border border-line bg-card p-4 text-sm">
        <Row label="BMR (Mifflin-St Jeor)" value={`${targets.bmr} kcal`} />
        <Row label="Maintenance (TDEE)" value={`${targets.tdee} kcal`} />
        <Row label="Based on" value={`${round1(targets.weightKg)} kg, age ${targets.age}`} />
      </dl>

      <TargetNotes targets={targets} />
    </div>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl py-2 ${highlight ? 'bg-protein/15' : 'bg-line/60'}`}>
      <p className={`text-xl font-semibold tabular-nums ${highlight ? 'text-protein' : ''}`}>{value} g</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

const round1 = (n: number) => Math.round(n * 10) / 10
