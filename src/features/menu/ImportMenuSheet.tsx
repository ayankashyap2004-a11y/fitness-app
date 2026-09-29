import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { applyMenuImport, type ImportSummary, type Resolution } from '../../db/menu'
import { db } from '../../db/schema'
import type { FoodItem } from '../../db/types'
import {
  buildNameLookup,
  matchMenu,
  parseMenuText,
  suggestDishes,
  type ParsedMenu,
  type UnmatchedName,
} from '../../engine/menu'
import { SLOT_LABELS } from '../food/slots'
import { ArchetypePicker } from '../../components/ArchetypePicker'
import { MENU_PROMPT } from './menuPrompt'

/** Suggestions this close are almost always a spelling of the same dish (e.g. one typo in three words). */
const AUTO_ALIAS_SCORE = 0.9

/** A resolution being filled in: 'new-pending' means New dish is chosen but no archetype yet. */
type Draft = Resolution | { kind: 'new-pending' } | null

const isComplete = (d: Draft): d is Resolution => d !== null && d.kind !== 'new-pending'

type Step = { kind: 'input' } | { kind: 'review'; menu: ParsedMenu } | { kind: 'done'; summary: ImportSummary }

export function ImportMenuSheet({ onClose }: { onClose: () => void }) {
  const items = useLiveQuery(() => db.foodItems.toArray())
  const [step, setStep] = useState<Step>({ kind: 'input' })

  return (
    <BottomSheet title="Import mess menu" onClose={onClose}>
      {!items ? null : step.kind === 'input' ? (
        <InputStep onParsed={(menu) => setStep({ kind: 'review', menu })} />
      ) : step.kind === 'review' ? (
        <ReviewStep
          menu={step.menu}
          items={items}
          onBack={() => setStep({ kind: 'input' })}
          onSaved={(summary) => setStep({ kind: 'done', summary })}
        />
      ) : (
        <div className="space-y-4 py-4">
          <p className="text-lg font-semibold">Menu saved</p>
          <p className="text-sm text-muted">
            {step.summary.days} day{step.summary.days === 1 ? '' : 's'} imported
            {step.summary.created > 0 && ` · ${step.summary.created} new dish${step.summary.created === 1 ? '' : 'es'}`}
            {step.summary.aliased > 0 && ` · ${step.summary.aliased} spelling${step.summary.aliased === 1 ? '' : 's'} learned`}
            {step.summary.skipped > 0 && ` · ${step.summary.skipped} skipped`}.
          </p>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}

function InputStep({ onParsed }: { onParsed: (menu: ParsedMenu) => void }) {
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const check = () => {
    const r = parseMenuText(text)
    if (r.ok) onParsed(r.menu)
    else setErrors(r.errors)
  }

  return (
    <div className="space-y-4 pt-2">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>Copy the prompt and send it to Claude with this week's menu photo.</li>
        <li>Copy Claude's JSON reply and paste it below.</li>
      </ol>
      <Button
        variant="secondary"
        className="w-full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(MENU_PROMPT)
            setCopied(true)
          } catch {
            setErrors(["Couldn't copy. Long-press to copy the prompt from Settings instead."])
          }
        }}
      >
        {copied ? 'Prompt copied ✓' : 'Copy prompt for Claude'}
      </Button>

      <textarea
        aria-label="Menu JSON"
        placeholder='{"weekStart": "2026-09-28", "days": [ … ] }'
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setErrors([])
        }}
        rows={8}
        spellCheck={false}
        className="w-full rounded-xl border border-line bg-surface p-3 font-mono text-base outline-none focus:border-accent"
      />

      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted">
        …or choose a .json file
        <input
          type="file"
          accept="application/json,.json,.txt"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) {
              setText(await file.text())
              setErrors([])
            }
          }}
        />
      </label>

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <Button className="w-full" onClick={check} disabled={!text.trim()}>
        Check menu
      </Button>
    </div>
  )
}

interface ReviewProps {
  menu: ParsedMenu
  items: FoodItem[]
  onBack: () => void
  onSaved: (s: ImportSummary) => void
}

function ReviewStep({ menu, items, onBack, onSaved }: ReviewProps) {
  const match = useMemo(() => matchMenu(menu, buildNameLookup(items)), [menu, items])
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const suggestions = useMemo(
    () => new Map(match.unmatched.map((u) => [u.key, suggestDishes(u.name, items, 2)])),
    [match, items],
  )

  const [resolutions, setResolutions] = useState<Map<string, Draft>>(() => {
    const init = new Map<string, Draft>()
    for (const u of match.unmatched) {
      const top = suggestions.get(u.key)?.[0]
      if (top && top.score >= AUTO_ALIAS_SCORE) init.set(u.key, { kind: 'alias', foodId: top.id })
      else {
        const archetypeId = top ? byId.get(top.id)?.archetypeId : undefined
        init.set(u.key, archetypeId ? { kind: 'new', archetypeId } : { kind: 'new-pending' })
      }
    }
    return init
  })
  const [saving, setSaving] = useState(false)

  const set = (key: string, r: Draft) => setResolutions((m) => new Map(m).set(key, r))
  const pending = match.unmatched.filter((u) => !isComplete(resolutions.get(u.key) ?? null)).length

  const save = async () => {
    setSaving(true)
    try {
      const final = new Map<string, Resolution>()
      for (const [k, r] of resolutions) if (isComplete(r)) final.set(k, r)
      onSaved(await applyMenuImport(db, menu, match.unmatched, final))
    } finally {
      setSaving(false)
    }
  }

  const first = menu.days[0]!.date
  const last = menu.days[menu.days.length - 1]!.date

  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-2xl bg-surface p-3 text-sm">
        <p>
          {menu.days.length} day{menu.days.length === 1 ? '' : 's'} · {shortDate(first)}
          {first !== last && ` – ${shortDate(last)}`}
        </p>
        <p className="text-muted">
          {match.matchedCount} of {match.totalCount} dishes recognised
          {match.unmatched.length > 0 && ` · ${match.unmatched.length} new name${match.unmatched.length === 1 ? '' : 's'} to check`}
        </p>
      </div>

      {match.unmatched.map((u) => (
        <UnmatchedRow
          key={u.key}
          u={u}
          suggestions={(suggestions.get(u.key) ?? []).map((s) => byId.get(s.id)!).filter(Boolean)}
          value={resolutions.get(u.key) ?? null}
          onChange={(r) => set(u.key, r)}
        />
      ))}

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-[2]" onClick={save} disabled={pending > 0 || saving}>
          {pending > 0 ? `${pending} left to check` : 'Save menu'}
        </Button>
      </div>
    </div>
  )
}

interface RowProps {
  u: UnmatchedName
  suggestions: FoodItem[]
  value: Draft
  onChange: (r: Draft) => void
}

function UnmatchedRow({ u, suggestions, value, onChange }: RowProps) {
  const isNew = value?.kind === 'new' || value?.kind === 'new-pending'
  const chip = (active: boolean) =>
    `min-h-11 rounded-full border px-3 text-sm text-left ${active ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-surface'}`

  return (
    <div className={`space-y-2 rounded-2xl border p-3 ${isComplete(value) ? 'border-line' : 'border-amber-400/50'} bg-card`}>
      <div>
        <p className="font-medium">{u.name}</p>
        <p className="text-xs text-muted">
          {u.slots.map((s) => SLOT_LABELS[s]).join(', ')} · {u.count}× this import
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={value?.kind === 'alias' && value.foodId === s.id}
            onClick={() => onChange({ kind: 'alias', foodId: s.id })}
            className={chip(value?.kind === 'alias' && value.foodId === s.id)}
          >
            Same as {s.name}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={isNew}
          onClick={() => onChange(value?.kind === 'new' ? value : { kind: 'new-pending' })}
          className={chip(isNew)}
        >
          New dish
        </button>
        <button type="button" aria-pressed={value?.kind === 'skip'} onClick={() => onChange({ kind: 'skip' })} className={chip(value?.kind === 'skip')}>
          Skip
        </button>
      </div>
      {isNew && (
        <ArchetypePicker
          value={value?.kind === 'new' ? value.archetypeId : undefined}
          onChange={(archetypeId) => onChange({ kind: 'new', archetypeId })}
        />
      )}
    </div>
  )
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
