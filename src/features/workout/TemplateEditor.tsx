import { useState } from 'react'
import { Button } from '../../components/Button'
import { Stepper } from '../../components/Stepper'
import { db } from '../../db/schema'
import type { Exercise, WorkoutTemplate } from '../../db/types'
import { resetTemplate, saveTemplate } from '../../db/workout'
import {
  availableIn,
  formatRepRange,
  formatRest,
  moveItem,
  newTemplateKey,
  swapCandidates,
  type TemplateExercise,
  type TrainingMode,
} from '../../engine/workout'
import { ExercisePicker } from './ExercisePicker'

const REST_OPTIONS = [60, 90, 120, 150, 180, 240]
const RIR_OPTIONS = ['0', '0–1', '1', '1–2', '2', '2–3', '3']

interface Props {
  day: WorkoutTemplate
  library: Map<string, Exercise>
  onClose: () => void
}

type Picking = { kind: 'swap'; key: string; mode: TrainingMode } | { kind: 'add' }

/** Edits save straight to the template; sessions already started keep their own copy. */
export function TemplateEditor({ day, library, onClose }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const [picking, setPicking] = useState<Picking | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const save = (exercises: TemplateExercise[]) => saveTemplate(db, { ...day, exercises })
  const update = (key: string, patch: Partial<TemplateExercise>) => save(day.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)))

  const addExercise = (gym: Exercise) => {
    // Pick a home counterpart: the same exercise if it works at home, else the closest match.
    const home = availableIn(gym, 'home') ? gym : swapCandidates(gym, [...library.values()], 'home')[0] ?? gym
    const entry: TemplateExercise = {
      key: newTemplateKey(day),
      gymId: gym.id,
      homeId: home.id,
      sets: 3,
      repRange: gym.kind === 'compound' ? [8, 10] : [10, 15],
      rir: gym.kind === 'compound' ? '1–2' : '0–1',
      restSec: gym.kind === 'compound' ? 150 : 90,
    }
    save([...day.exercises, entry])
    setOpen(entry.key)
  }

  return (
    <section className="space-y-3 px-4 pt-4 pb-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted">Edit day</p>
          <h1 className="text-xl font-semibold">{day.name}</h1>
        </div>
        <Button onClick={onClose}>Done</Button>
      </header>
      <p className="text-sm text-muted">Changes save as you go and apply to your next session of this day.</p>

      <ol className="space-y-2">
        {day.exercises.map((e, i) => {
          const gym = library.get(e.gymId)
          const home = library.get(e.homeId)
          const expanded = open === e.key
          return (
            <li key={e.key} className="rounded-2xl border border-line bg-card">
              <div className="flex items-center gap-1 p-2">
                <div className="flex flex-col">
                  <button type="button" aria-label={`Move ${gym?.name} up`} disabled={i === 0} onClick={() => save(moveItem(day.exercises, i, -1))} className="h-11 w-11 rounded-lg text-muted disabled:opacity-20 active:bg-line">
                    ▲
                  </button>
                  <button type="button" aria-label={`Move ${gym?.name} down`} disabled={i === day.exercises.length - 1} onClick={() => save(moveItem(day.exercises, i, 1))} className="h-11 w-11 rounded-lg text-muted disabled:opacity-20 active:bg-line">
                    ▼
                  </button>
                </div>
                <button type="button" onClick={() => setOpen(expanded ? null : e.key)} aria-expanded={expanded} className="min-h-14 min-w-0 flex-1 px-2 text-left">
                  <span className="block truncate font-medium">{gym?.name ?? e.gymId}</span>
                  <span className="block truncate text-xs text-muted">Home: {home?.name ?? e.homeId}</span>
                  <span className="block text-sm text-muted tabular-nums">
                    {e.sets} × {formatRepRange(e.repRange)} · RIR {e.rir} · {formatRest(e.restSec)}
                    {e.superset ? ' · superset' : ''}
                  </span>
                </button>
              </div>

              {expanded && (
                <div className="space-y-4 border-t border-line p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => setPicking({ kind: 'swap', key: e.key, mode: 'gym' })}>
                      Swap gym
                    </Button>
                    <Button variant="secondary" onClick={() => setPicking({ kind: 'swap', key: e.key, mode: 'home' })}>
                      Swap home
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Sets</span>
                    <Stepper size="sm" step={1} min={1} max={10} label="Sets" value={e.sets} onChange={(sets) => update(e.key, { sets })} />
                  </div>

                  <div>
                    <span className="mb-1 block text-sm text-muted">Rep range</span>
                    <span className="flex items-center justify-between gap-2">
                      <Stepper size="sm" step={1} min={1} max={e.repRange[1]} label="Minimum reps" value={e.repRange[0]} onChange={(lo) => update(e.key, { repRange: [lo, e.repRange[1]] })} />
                      <span className="text-muted">–</span>
                      <Stepper size="sm" step={1} min={e.repRange[0]} max={50} label="Maximum reps" value={e.repRange[1]} onChange={(hi) => update(e.key, { repRange: [e.repRange[0], hi] })} />
                    </span>
                  </div>

                  <Choice label="Rest" value={String(e.restSec)} options={REST_OPTIONS.map((s) => ({ value: String(s), label: formatRest(s) }))} onChange={(v) => update(e.key, { restSec: Number(v) })} />
                  <Choice label="RIR" value={e.rir} options={RIR_OPTIONS.map((r) => ({ value: r, label: r }))} onChange={(rir) => update(e.key, { rir })} />

                  <button
                    type="button"
                    onClick={() => {
                      save(day.exercises.filter((x) => x.key !== e.key))
                      setOpen(null)
                    }}
                    className="min-h-11 w-full rounded-xl text-sm text-red-300 active:bg-line"
                  >
                    Remove from {day.name}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <button type="button" onClick={() => setPicking({ kind: 'add' })} className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-dashed border-line px-4 text-accent">
        <span className="text-xl leading-none">+</span> Add exercise
      </button>

      {confirmReset ? (
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-card p-3 text-sm">
          <span className="flex-1">Reset {day.name} to the original plan?</span>
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await resetTemplate(db, day.dayIndex)
              setConfirmReset(false)
              setOpen(null)
            }}
          >
            Reset
          </Button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmReset(true)} className="min-h-11 w-full text-sm text-muted">
          Reset {day.name} to the original plan
        </button>
      )}

      {picking && (
        <ExercisePicker
          title={picking.kind === 'add' ? 'Add exercise' : `Swap ${picking.mode} exercise`}
          mode={picking.kind === 'add' ? 'gym' : picking.mode}
          library={library}
          current={
            picking.kind === 'swap'
              ? library.get(day.exercises.find((x) => x.key === picking.key)![picking.mode === 'gym' ? 'gymId' : 'homeId'])
              : undefined
          }
          onPick={(ex) => {
            if (picking.kind === 'add') addExercise(ex)
            else update(picking.key, picking.mode === 'gym' ? { gymId: ex.id, gymNote: undefined } : { homeId: ex.id, homeNote: undefined })
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </section>
  )
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={`min-h-11 min-w-11 rounded-lg px-2.5 text-sm ${o.value === value ? 'bg-accent/15 text-accent' : 'bg-surface text-muted'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
