import { useState } from 'react'
import { useExerciseHistory, useExercises, useTrainedExercises } from '../../db/hooks'
import { lastTimeLabel } from '../../engine/workout'
import { MODE_LABELS } from '../workout/labels'

/** Per-exercise log of every completed session's sets (display only). */
export function HistorySection() {
  const trained = useTrainedExercises()
  const exercises = useExercises()
  const [picked, setPicked] = useState<string | null>(null)
  const current = picked ?? trained?.[0] ?? null
  const history = useExerciseHistory(current)
  if (!trained || !exercises) return null

  const ex = current ? exercises.get(current) : undefined

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Exercise history</h2>
      {trained.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">Finish a workout to see your history here.</p>
      ) : (
        <>
          <label className="block">
            <span className="sr-only">Exercise</span>
            <select
              value={current ?? ''}
              onChange={(e) => setPicked(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-line bg-card px-3 text-base"
            >
              {trained.map((id) => (
                <option key={id} value={id}>
                  {exercises.get(id)?.name ?? id}
                </option>
              ))}
            </select>
          </label>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
            {(history ?? []).map(({ session, sets }) => (
              <li key={session.id} className="px-4 py-3">
                <p className="text-sm text-muted">
                  {new Date(session.startedAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {session.dayName} ·{' '}
                  {MODE_LABELS[session.mode]}
                  {session.isDeload ? ' · deload' : ''}
                </p>
                <p className="mt-0.5 text-sm tabular-nums">
                  {sets.map((s) => lastTimeLabel(s, !!ex?.bodyweight) + (s.rir !== undefined ? ` @${s.rir === 3 ? '3+' : s.rir}` : '')).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
