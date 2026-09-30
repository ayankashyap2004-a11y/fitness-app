import { useMemo, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import type { Exercise } from '../../db/types'
import { normalizeName } from '../../engine/food'
import { availableIn, swapCandidates, type TrainingMode } from '../../engine/workout'
import { MODE_LABELS, MUSCLE_LABELS } from './labels'

interface Props {
  title: string
  mode: TrainingMode
  library: Map<string, Exercise>
  /** When swapping, the current exercise: similar ones are listed first. */
  current?: Exercise
  onPick: (e: Exercise) => void
  onClose: () => void
}

export function ExercisePicker({ title, mode, library, current, onPick, onClose }: Props) {
  const [q, setQ] = useState('')
  const all = useMemo(
    () => [...library.values()].filter((e) => availableIn(e, mode)).sort((a, b) => a.name.localeCompare(b.name)),
    [library, mode],
  )
  const similar = useMemo(() => (current ? swapCandidates(current, [...library.values()], mode) : []), [current, library, mode])

  const needle = normalizeName(q)
  const matches = (e: Exercise) =>
    !needle || normalizeName(`${e.name} ${e.muscles.primary.map((m) => MUSCLE_LABELS[m]).join(' ')}`).includes(needle)

  const row = (e: Exercise) => (
    <li key={e.id}>
      <button
        type="button"
        onClick={() => onPick(e)}
        className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left active:bg-line ${
          e.id === current?.id ? 'text-accent' : ''
        }`}
      >
        <span className="min-w-0">
          <span className="block truncate">{e.name}</span>
          <span className="block truncate text-xs text-muted">{e.muscles.primary.map((m) => MUSCLE_LABELS[m]).join(', ')}</span>
        </span>
        <span className="shrink-0 text-xs text-muted">{e.equipment === 'both' ? 'Gym + home' : MODE_LABELS[e.equipment]}</span>
      </button>
    </li>
  )

  const similarShown = similar.filter(matches)
  const rest = all.filter((e) => matches(e) && !similarShown.includes(e))

  return (
    <BottomSheet title={title} onClose={onClose}>
      <input
        type="search"
        placeholder="Search exercises or muscles"
        aria-label="Search exercises"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-2 mb-3 min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-accent"
      />
      {similarShown.length > 0 && (
        <>
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted">Trains the same muscles</p>
          <ul className="mb-3">{similarShown.map(row)}</ul>
        </>
      )}
      <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted">All {MODE_LABELS[mode].toLowerCase()} exercises</p>
      <ul>{rest.map(row)}</ul>
    </BottomSheet>
  )
}
