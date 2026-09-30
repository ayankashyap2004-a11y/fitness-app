import { useState } from 'react'
import { Button } from '../../components/Button'
import { useAppMeta, useExercises, useRecentSessions, useTemplates } from '../../db/hooks'
import { db } from '../../db/schema'
import { startSession } from '../../db/workout'
import { formatClock, formatRepRange, planForMode, type TrainingMode } from '../../engine/workout'
import { MODE_LABELS } from './labels'

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
  const [mode, setMode] = useState<TrainingMode>(readMode)
  const [picked, setPicked] = useState<number | null>(null)

  if (!templates || !exercises || !meta || !recent) return null
  if (templates.length === 0) return <p className="px-4 pt-6 text-sm text-muted">Loading your split…</p>

  const nextIndex = meta.splitPointer % templates.length
  const dayIndex = picked ?? nextIndex
  const day = templates.find((t) => t.dayIndex === dayIndex) ?? templates[0]!
  const plan = planForMode(day, mode)

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

      {recent.length > 0 && (
        <div>
          <h2 className="mb-1.5 text-sm font-medium text-muted">Recent sessions</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card text-sm">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-2.5">
                <span>
                  {s.dayName} · {MODE_LABELS[s.mode]}
                </span>
                <span className="text-muted tabular-nums">
                  {new Date(s.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {formatClock(s.durationSec ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
