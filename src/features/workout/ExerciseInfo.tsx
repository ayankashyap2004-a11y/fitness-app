import type { Exercise } from '../../db/types'
import { MUSCLE_LABELS } from './labels'

/** How-to steps, cues and common mistakes (text only in v1). */
export function ExerciseInfo({ exercise }: { exercise: Exercise }) {
  const { primary, secondary } = exercise.muscles
  return (
    <div className="space-y-3 rounded-xl bg-surface p-3 text-sm">
      <p className="text-muted">
        Works <span className="text-ink">{primary.map((m) => MUSCLE_LABELS[m]).join(', ')}</span>
        {secondary.length > 0 && <> · helps {secondary.map((m) => MUSCLE_LABELS[m]).join(', ')}</>}
      </p>
      <div>
        <p className="mb-1 font-medium">How to</p>
        <ol className="list-decimal space-y-1 pl-5">
          {exercise.howTo.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      <div>
        <p className="mb-1 font-medium">Cues</p>
        <ul className="list-disc space-y-1 pl-5">
          {exercise.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 font-medium">Common mistakes</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          {exercise.mistakes.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
