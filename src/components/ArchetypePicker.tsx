import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../db/schema'
import type { Archetype } from '../db/types'
import { normalizeName } from '../engine/food'

interface Props {
  value?: string
  onChange: (archetypeId: string) => void
}

/** Inline, searchable list of the dish archetypes, grouped as in the PRD. */
export function ArchetypePicker({ value, onChange }: Props) {
  const archetypes = useLiveQuery(() => db.archetypes.toArray())
  const [open, setOpen] = useState(!value)
  const [q, setQ] = useState('')

  const groups = useMemo(() => {
    if (!archetypes) return []
    const needle = normalizeName(q)
    const hits = needle
      ? archetypes.filter((a) => normalizeName(`${a.name} ${a.group}`).includes(needle))
      : archetypes
    const map = new Map<string, Archetype[]>()
    for (const a of hits) map.set(a.group, [...(map.get(a.group) ?? []), a])
    return [...map.entries()]
  }, [archetypes, q])

  const current = archetypes?.find((a) => a.id === value)

  if (!open && current) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 text-left text-sm"
      >
        <span>
          <span className="text-muted">Counts as </span>
          {current.name}
        </span>
        <span className="text-accent">Change</span>
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-line bg-surface p-2">
      <input
        type="search"
        placeholder="Which kind of dish? e.g. paneer, dal, dry veg"
        aria-label="Search dish types"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-h-11 w-full rounded-lg border border-line bg-card px-3 text-base outline-none focus:border-accent"
      />
      <div className="max-h-64 overflow-y-auto">
        {groups.map(([group, items]) => (
          <div key={group}>
            <p className="px-2 pt-2 text-xs font-medium uppercase tracking-wide text-muted">{group}</p>
            <ul>
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(a.id)
                      setOpen(false)
                      setQ('')
                    }}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-sm active:bg-line ${
                      a.id === value ? 'text-accent' : ''
                    }`}
                  >
                    <span>{a.name}</span>
                    <span className="shrink-0 text-muted tabular-nums">
                      {a.perPortion.kcal} kcal · {a.perPortion.protein} g P
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {groups.length === 0 && <p className="p-2 text-sm text-muted">No dish type matches.</p>}
      </div>
    </div>
  )
}
