import { useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { useProfile, useToday, useWeightLogs } from '../../db/hooks'
import { deleteWeight, logWeight } from '../../db/profile'
import { db } from '../../db/schema'
import { addDays } from '../../engine/dates'
import { LIMITS, parseDecimal } from '../../engine/profile'
import { GOAL_BANDS, bandAt, bandStatus, movingAverage7, rangeStart, weeklyRate, type ChartRange } from '../../engine/trends'
import { WeightChart, type WeightChartData } from './WeightChart'

const RANGES: { value: ChartRange; label: string }[] = [
  { value: '4w', label: '4 weeks' },
  { value: '12w', label: '12 weeks' },
  { value: 'all', label: 'All time' },
]

const GOAL_WORDS = { fat_loss: 'fat-loss', muscle_gain: 'muscle-gain', recomp: 'recomp' } as const

const noonSec = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!, 12).getTime() / 1000
}

export function WeightSection() {
  const today = useToday()
  const logs = useWeightLogs()
  const profile = useProfile()
  const [range, setRange] = useState<ChartRange>('4w')
  const [adding, setAdding] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const chart = useMemo((): WeightChartData | null => {
    if (!logs || logs.length === 0 || !profile) return null
    const start = rangeStart(range, today, logs[0]!.date)
    const byDate = new Map(logs.map((l) => [l.date, l.weightKg]))
    const avg = new Map(movingAverage7(logs).map((a) => [a.date, a.avg]))
    const firstAvg = [...avg.entries()].find(([d]) => d >= start)
    const band = GOAL_BANDS[profile.goal]
    const data: WeightChartData = { x: [], weighIns: [], avg7: [], bandLo: [], bandHi: [] }
    for (let d = start; d <= today; d = addDays(d, 1)) {
      data.x.push(noonSec(d))
      data.weighIns.push(byDate.get(d) ?? null)
      data.avg7.push(avg.get(d) ?? null)
      const b = firstAvg && d >= firstAvg[0] ? bandAt(firstAvg[1], firstAvg[0], d, band) : null
      data.bandLo.push(b ? Math.round(b.lo * 100) / 100 : null)
      data.bandHi.push(b ? Math.round(b.hi * 100) / 100 : null)
    }
    return data
  }, [logs, profile, range, today])

  if (!logs || !profile) return null

  const rate = weeklyRate(logs, today)
  const band = GOAL_BANDS[profile.goal]
  const status = rate ? bandStatus(rate.pctPerWeek, band) : null
  const statusText =
    status === 'inside'
      ? `inside your ${GOAL_WORDS[profile.goal]} band`
      : status === 'above'
        ? `above your ${GOAL_WORDS[profile.goal]} band (${band.lo}% to ${band.hi}%/week)`
        : status === 'below'
          ? `below your ${GOAL_WORDS[profile.goal]} band (${band.lo}% to ${band.hi}%/week)`
          : ''
  const recent = [...logs].reverse()

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bodyweight</h2>
        <Button variant="secondary" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Close' : 'Log weight'}
        </Button>
      </div>

      {adding && <AddWeight today={today} onDone={() => setAdding(false)} />}

      <div className="rounded-2xl border border-line bg-card p-3">
        <div className="mb-2 grid grid-cols-3 gap-1" role="radiogroup" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={range === r.value}
              onClick={() => setRange(r.value)}
              className={`min-h-11 rounded-lg text-sm ${range === r.value ? 'bg-accent/15 text-accent' : 'text-muted'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {chart ? <WeightChart data={chart} /> : <p className="py-8 text-center text-sm text-muted">Log a weigh-in to start your chart.</p>}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-protein align-middle" />
            weigh-in
          </span>
          <span>
            <span className="mr-1 inline-block h-0.5 w-3 bg-accent align-middle" />
            7-day average
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-3 bg-accent/20 align-middle" />
            goal band
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-sm text-muted">Weekly rate (last 4 weeks)</p>
        {rate ? (
          <>
            <p className="text-xl font-semibold tabular-nums">
              {rate.kgPerWeek > 0 ? '+' : ''}
              {rate.kgPerWeek} kg/week <span className="text-base font-normal text-muted">({rate.pctPerWeek > 0 ? '+' : ''}{rate.pctPerWeek}%)</span>
            </p>
            <p className={`text-sm ${status === 'inside' ? 'text-accent' : 'text-amber-300'}`}>{statusText}</p>
            <p className="mt-1 text-xs text-muted">Display only; you decide whether to adjust.</p>
          </>
        ) : (
          <p className="text-sm text-muted">Needs at least 4 weigh-ins over 10+ days.</p>
        )}
      </div>

      {recent.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-sm font-medium text-muted">Weigh-ins</h3>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
            {(showAll ? recent : recent.slice(0, 5)).map((l) => (
              <WeightRow key={l.date} date={l.date} kg={l.weightKg} />
            ))}
          </ul>
          {recent.length > 5 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="min-h-11 w-full text-sm text-accent">
              {showAll ? 'Show fewer' : `Show all ${recent.length}`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function AddWeight({ today, onDone }: { today: string; onDone: () => void }) {
  const [date, setDate] = useState(today)
  const [kg, setKg] = useState('')
  const w = parseDecimal(kg)
  const valid = w >= LIMITS.weightKg[0] && w <= LIMITS.weightKg[1] && date <= today
  return (
    <form
      className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-card p-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid) return
        await logWeight(db, date, Math.round(w * 10) / 10)
        onDone()
      }}
    >
      <Field label="Date" type="date" max={today} value={date} onChange={setDate} />
      <Field label="Weight" suffix="kg" inputMode="decimal" value={kg} onChange={setKg} />
      <p className="col-span-2 text-xs text-muted">Logging a date that already has a weigh-in replaces it.</p>
      <Button type="submit" className="col-span-2" disabled={!valid}>
        Save weigh-in
      </Button>
    </form>
  )
}

function WeightRow({ date, kg }: { date: string; kg: number }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(kg))
  const w = parseDecimal(value)
  const valid = w >= LIMITS.weightKg[0] && w <= LIMITS.weightKg[1]
  const label = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  if (!editing) {
    return (
      <li>
        <button type="button" onClick={() => setEditing(true)} className="flex min-h-12 w-full items-center justify-between px-4 text-left active:bg-line/50">
          <span className="text-sm text-muted">{label}</span>
          <span className="tabular-nums">{kg} kg</span>
        </button>
      </li>
    )
  }
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <span className="flex-1 text-sm text-muted">{label}</span>
      <input
        aria-label={`Weight on ${label}`}
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-11 w-20 rounded-lg bg-surface text-center text-base tabular-nums outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={async () => {
          await logWeight(db, date, Math.round(w * 10) / 10)
          setEditing(false)
        }}
        className="h-11 rounded-lg px-3 text-sm text-accent disabled:opacity-40"
      >
        Save
      </button>
      <button type="button" onClick={() => deleteWeight(db, date)} className="h-11 rounded-lg px-2 text-sm text-red-300">
        Delete
      </button>
    </li>
  )
}
