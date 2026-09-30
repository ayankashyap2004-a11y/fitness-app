import { useState } from 'react'
import { parseDecimal } from '../engine/profile'
import { lastTimeLabel } from '../engine/workout'

export interface SetValues {
  weightKg: number
  reps: number
  rir?: number
}

interface Props {
  setNo: number
  /** Already-logged values for this set, if any. */
  logged?: SetValues
  /** Starting values: the same set last time. */
  prefill: { weightKg: number; reps: number } | null
  /** The same set last session, shown as-is (no suggestions). */
  last?: { weightKg: number; reps: number }
  bodyweight?: boolean
  onLog: (v: SetValues) => void
  onUndo?: () => void
}

const RIR_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3+' },
]

/**
 * One set: weight × reps, pre-filled from last time so an unchanged set is one tap on ✓.
 * After logging, an optional RIR tap records how hard it was.
 */
export function SetRow({ setNo, logged, prefill, last, bodyweight = false, onLog, onUndo }: Props) {
  const start = logged ?? prefill
  const [weight, setWeight] = useState(start ? String(start.weightKg) : bodyweight ? '0' : '')
  const [reps, setReps] = useState(start ? String(start.reps) : '')
  const [editing, setEditing] = useState(false)

  const w = weight.trim() === '' ? (bodyweight ? 0 : NaN) : parseDecimal(weight)
  const r = parseDecimal(reps)
  const valid = !Number.isNaN(w) && Number.isInteger(r) && r > 0
  const isLogged = !!logged && !editing
  const dirty = !!logged && (w !== logged.weightKg || r !== logged.reps)

  const submit = () => {
    if (!valid) return
    onLog({ weightKg: w, reps: r, rir: logged?.rir })
    setEditing(false)
  }

  const input =
    'h-11 min-w-0 rounded-lg bg-surface text-center text-lg font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent disabled:opacity-100'

  return (
    <div className={`rounded-xl px-2 py-1.5 ${isLogged ? 'bg-accent/10' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-center text-sm text-muted tabular-nums">{setNo}</span>
        <label className="flex min-w-0 flex-1 items-center gap-1">
          <input
            aria-label={`Set ${setNo} weight`}
            inputMode="decimal"
            value={weight}
            placeholder={bodyweight ? 'BW' : 'kg'}
            onFocus={(e) => {
              e.target.select()
              if (logged) setEditing(true)
            }}
            onChange={(e) => setWeight(e.target.value)}
            className={`${input} w-full`}
          />
          <span className="shrink-0 text-xs text-muted">{bodyweight ? '+kg' : 'kg'}</span>
        </label>
        <span className="text-muted">×</span>
        <label className="flex w-20 shrink-0 items-center gap-1">
          <input
            aria-label={`Set ${setNo} reps`}
            inputMode="numeric"
            value={reps}
            placeholder="reps"
            onFocus={(e) => {
              e.target.select()
              if (logged) setEditing(true)
            }}
            onChange={(e) => setReps(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            className={`${input} w-full`}
          />
        </label>
        <button
          type="button"
          aria-label={isLogged ? `Set ${setNo} logged` : `Log set ${setNo}`}
          aria-pressed={isLogged}
          disabled={!valid || (isLogged && !dirty)}
          onClick={submit}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
            isLogged ? 'bg-accent text-surface' : 'border border-line bg-surface text-accent disabled:text-muted disabled:opacity-40'
          }`}
        >
          ✓
        </button>
      </div>

      <p className="mt-0.5 truncate pl-8 text-xs text-muted">{last ? `Last time: ${lastTimeLabel(last, bodyweight)}` : 'No previous set'}</p>

      {isLogged && (
        <div className="mt-1 flex items-center gap-1 pl-8" role="group" aria-label={`Set ${setNo} reps in reserve`}>
          <span className="mr-1 text-xs text-muted">RIR</span>
          {RIR_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={logged?.rir === o.value}
              onClick={() => onLog({ weightKg: logged!.weightKg, reps: logged!.reps, rir: logged?.rir === o.value ? undefined : o.value })}
              className={`h-11 min-w-11 rounded-lg px-2 text-sm ${logged?.rir === o.value ? 'bg-accent text-surface' : 'bg-surface text-muted'}`}
            >
              {o.label}
            </button>
          ))}
          {onUndo && (
            <button type="button" onClick={onUndo} aria-label={`Undo set ${setNo}`} className="ml-auto h-11 px-2 text-sm text-muted">
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
