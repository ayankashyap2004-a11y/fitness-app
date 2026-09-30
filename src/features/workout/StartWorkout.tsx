import { useState } from 'react'
import { Button } from '../../components/Button'
import { useAppMeta, useExercises, useRecentCardio, useRecentSessions, useTemplates, useToday, useWeekSummary } from '../../db/hooks'
import type { CardioLog } from '../../db/types'
import { db } from '../../db/schema'
import { startSession } from '../../db/workout'
import { deloadSets, isDeloadWeek } from '../../engine/deload'
import { formatClock, formatRepRange, planForMode, type TrainingMode } from '../../engine/workout'
import { CardioSheet } from './CardioSheet'
import { DeloadBanner } from './DeloadBanner'
import { CARDIO_LABELS, MODE_LABELS } from './labels'
import { WeekCard } from './WeekCard'

// Small UI preference: the last gym/home choice.
const MODE_KEY = 'ui.workoutMode'

function readMode(): TrainingMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'home' ? 'home' : 'gym'
  } catch {
    return 'gym'
  }
}

interface Props {
  onEdit: (dayIndex: number) => void
}

export function StartWorkout({ onEdit }: Props) {
  const templates = useTemplates()
  const exercises = useExercises()
  const meta = useAppMeta()
  const recent = useRecentSessions()
  const today = useToday()
  const week = useWeekSummary(today)
  const cardio = useRecentCardio()
  const [mode, setMode] = useState<TrainingMode>(readMode)
  const [picked, setPicked] = useState<number | null>(null)
  const [cardioSheet, setCardioSheet] = useState<{ entry?: CardioLog } | null>(null)

  if (!templates || !exercises || !meta || !recent || !week || !cardio) return null
  if (templates.length === 0) return <p className="px-4 pt-6 text-sm text-muted">Loading your split…</p>

  const nextIndex = meta.splitPointer % templates.length
  const dayIndex = picked ?? nextIndex
  const day = templates.find((t) => t.dayIndex === dayIndex) ?? templates[0]!
  const deload = isDeloadWeek(week.deload)
  const plan = planForMode(day, mode).map((p) => (deload ? { ...p, sets: deloadSets(p.sets) } : p))

  const chooseMode = (m: TrainingMode) => {
    setMode(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      // ignore
    }
  }

  return (
    <section className="space-y-4 px-4 pt-6 pb-6">
      <header>
        <p className="text-sm text-muted">{dayIndex === nextIndex ? 'Next in your rotation' : 'Different day'}</p>
        <h1 className="text-2xl font-semibold">
          Day {day.dayIndex + 1}: {day.name}
        </h1>
        <p className="text-sm text-muted">{day.focus}</p>
      </header>

      <DeloadBanner status={week.deload} today={today} />

      <div className="flex gap-1 rounded-xl bg-card p-1" role="radiogroup" aria-label="Where are you training?">
        {(['gym', 'home'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => chooseMode(m)}
            className={`min-h-12 flex-1 rounded-lg ${mode === m ? 'bg-accent font-semibold text-surface' : 'text-muted'}`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <ol className="divide-y divide-line rounded-2xl border border-line bg-card">
        {plan.map((p) => (
          <li key={p.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0">
              <span className="block truncate">{exercises.get(p.exerciseId)?.name ?? p.exerciseId}</span>
              {p.superset && <span className="text-xs text-accent">superset</span>}
            </span>
            <span className="shrink-0 text-sm text-muted tabular-nums">
              {p.sets} × {formatRepRange(p.repRange)}
            </span>
          </li>
        ))}
      </ol>

      <Button className="w-full" onClick={() => startSession(db, day.dayIndex, mode)}>
        Start {day.name} · {MODE_LABELS[mode]}
        {deload ? ' (deload)' : ''}
      </Button>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => onEdit(day.dayIndex)} className="min-h-11 rounded-lg px-2 text-sm text-accent active:bg-line">
          Edit {day.name}
        </button>
        {picked !== null && picked !== nextIndex && (
          <button type="button" onClick={() => setPicked(null)} className="min-h-11 rounded-lg px-2 text-sm text-muted active:bg-line">
            Back to next in rotation
          </button>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-sm text-muted">Do a different day</p>
        <div className="grid grid-cols-5 gap-1">
          {templates.map((t) => (
            <button
              key={t.dayIndex}
              type="button"
              aria-pressed={t.dayIndex === dayIndex}
              onClick={() => setPicked(t.dayIndex)}
              className={`min-h-11 rounded-lg text-xs ${t.dayIndex === dayIndex ? 'bg-accent/15 text-accent' : 'bg-card text-muted'}`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <WeekCard week={week} />

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">Cardio</h2>
          <button type="button" onClick={() => setCardioSheet({})} className="min-h-11 rounded-lg px-2 text-sm text-accent active:bg-line">
            + Log cardio
          </button>
        </div>
        {cardio.length > 0 ? (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card text-sm">
            {cardio.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setCardioSheet({ entry: c })} className="flex min-h-12 w-full items-center justify-between gap-2 px-4 py-2 text-left active:bg-line/50">
                  <span className="min-w-0 truncate">
                    {CARDIO_LABELS[c.type]}
                    {c.speedKmh !== undefined ? <span className="text-muted"> · {c.speedKmh} km/h{c.inclinePct ? ` @ ${c.inclinePct}%` : ''}</span> : null}
                    {c.note ? <span className="text-muted"> · {c.note}</span> : null}
                  </span>
                  <span className="shrink-0 text-muted tabular-nums">
                    {new Date(`${c.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {c.durationMin} min
                    {c.distanceKm !== undefined ? ` · ${c.distanceKm} km` : ''}
                    {c.kcalEstimate !== undefined ? ` · ≈${c.kcalEstimate} kcal` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">No cardio logged yet.</p>
        )}
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="mb-1.5 text-sm font-medium text-muted">Recent sessions</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card text-sm">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-2.5">
                <span>
                  {s.dayName} · {MODE_LABELS[s.mode]}
                  {s.isDeload ? <span className="ml-1 text-xs text-amber-300">deload</span> : null}
                </span>
                <span className="text-muted tabular-nums">
                  {new Date(s.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {formatClock(s.durationSec ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {cardioSheet && <CardioSheet today={today} entry={cardioSheet.entry} onClose={() => setCardioSheet(null)} />}
    </section>
  )
}
