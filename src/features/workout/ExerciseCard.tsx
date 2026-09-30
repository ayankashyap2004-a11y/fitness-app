import { useState } from 'react'
import { SetRow, type SetValues } from '../../components/SetRow'
import { db } from '../../db/schema'
import type { Exercise, SetLog } from '../../db/types'
import { addPlannedSet, deleteSet, logSet, setExerciseNote } from '../../db/workout'
import { formatRepRange, formatRest, prefillSet, type PlannedExercise } from '../../engine/workout'
import { ExerciseInfo } from './ExerciseInfo'

interface Props {
  sessionId: number
  planned: PlannedExercise
  exercise: Exercise
  /** Sets logged in this session for this plan entry. */
  sets: SetLog[]
  /** Same exercise's sets from the last completed session. */
  last: SetLog[]
  note?: string
  /** Called after a set is logged, with the rest to start (0 = none, e.g. inside a superset). */
  onLogged: (restSec: number) => void
  restSec: number
}

export function ExerciseCard({ sessionId, planned, exercise, sets, last, note, onLogged, restSec }: Props) {
  const [showInfo, setShowInfo] = useState(false)
  const [showNote, setShowNote] = useState(!!note)
  const [noteText, setNoteText] = useState(note ?? '')

  const bySetNo = new Map(sets.map((s) => [s.setNo, s]))
  const rows = Math.max(planned.sets, ...sets.map((s) => s.setNo))
  const done = sets.length >= planned.sets
  const bodyweight = !!exercise.bodyweight

  const log = async (setNo: number, v: SetValues, isNew: boolean) => {
    await logSet(db, { sessionId, planKey: planned.key, exerciseId: exercise.id, setNo, ...v })
    if (isNew) onLogged(restSec)
  }

  return (
    <article className="rounded-2xl border border-line bg-card p-3">
      <header className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <h3 className="font-semibold">
            {done && <span className="mr-1 text-accent">✓</span>}
            {exercise.name}
          </h3>
          {planned.note && <p className="text-xs text-muted">{planned.note}</p>}
          <p className="mt-0.5 text-sm text-muted tabular-nums">
            {planned.sets} × {formatRepRange(planned.repRange)}
            {exercise.perSide ? ' each side' : ''} · RIR {planned.rir} · rest {formatRest(planned.restSec)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          aria-expanded={showInfo}
          className="min-h-11 shrink-0 rounded-lg px-2 text-sm text-accent active:bg-line"
        >
          {showInfo ? 'Hide' : 'How to'}
        </button>
      </header>

      {showInfo && (
        <div className="mt-2">
          <ExerciseInfo exercise={exercise} />
        </div>
      )}

      <div className="mt-2 space-y-1">
        {Array.from({ length: rows }, (_, i) => i + 1).map((setNo) => {
          const logged = bySetNo.get(setNo)
          const lastSame = last.find((s) => s.setNo === setNo)
          // Last session's numbers first; the first time, copy the previous set from today.
          const prev = bySetNo.get(setNo - 1)
          const prefill = prefillSet(setNo, last) ?? (prev ? { weightKg: prev.weightKg, reps: prev.reps } : null)
          return (
            <SetRow
              // Remount an untouched row when its starting values change (e.g. set 1 just logged).
              key={logged ? `${setNo}` : `${setNo}:${prefill?.weightKg ?? ''}x${prefill?.reps ?? ''}`}
              setNo={setNo}
              logged={logged}
              prefill={prefill}
              last={lastSame}
              bodyweight={bodyweight}
              onLog={(v) => log(setNo, v, !logged)}
              onUndo={logged?.id !== undefined ? () => deleteSet(db, logged.id!) : undefined}
            />
          )
        })}
      </div>

      {exercise.kind === 'isolation' && (
        <p className="mt-2 px-1 text-xs text-muted">Optional: on the last set, after failure, add partial reps in the stretched half.</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" onClick={() => addPlannedSet(db, sessionId, planned.key)} className="min-h-11 rounded-lg px-2 text-sm text-accent active:bg-line">
          + Set
        </button>
        {!showNote && (
          <button type="button" onClick={() => setShowNote(true)} className="min-h-11 rounded-lg px-2 text-sm text-muted active:bg-line">
            Add note
          </button>
        )}
      </div>
      {showNote && (
        <textarea
          aria-label={`Note for ${exercise.name}`}
          placeholder="e.g. left shoulder felt tight"
          value={noteText}
          rows={2}
          onChange={(e) => setNoteText(e.target.value)}
          onBlur={() => setExerciseNote(db, sessionId, planned.key, noteText)}
          className="mt-1 w-full rounded-xl border border-line bg-surface p-2 text-base outline-none focus:border-accent"
        />
      )}
    </article>
  )
}
