import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { db } from '../../db/schema'
import type { FoodItem } from '../../db/types'
import { WHEY_ID, saveWhey, unpinWhey } from '../../db/whey'
import { splitUnit } from '../../engine/food'
import { parseDecimal } from '../../engine/profile'
import type { Macros } from '../../engine/types'

const MACROS: { key: keyof Macros; label: string; suffix: string }[] = [
  { key: 'kcal', label: 'Calories', suffix: 'kcal' },
  { key: 'protein', label: 'Protein', suffix: 'g' },
  { key: 'carbs', label: 'Carbs', suffix: 'g' },
  { key: 'fat', label: 'Fat', suffix: 'g' },
]

/** Whey from the tub label: entered once, then pinned to every meal with a one-tap +. */
export function WheySettings() {
  const whey = useLiveQuery(async () => (await db.foodItems.get(WHEY_ID)) ?? null)
  const pinned = useLiveQuery(() => db.pinnedItems.where('foodId').equals(WHEY_ID).count())
  const [editing, setEditing] = useState(false)
  if (whey === undefined || pinned === undefined) return null

  const header = (
    <div className="px-4 pt-3">
      <h2 className="font-medium">Whey protein</h2>
      <p className="text-sm text-muted">Enter the per-scoop values from your tub's label. It's then pinned to every meal.</p>
    </div>
  )

  if (editing || !whey) {
    return (
      <div className="rounded-2xl border border-line bg-card pb-4">
        {header}
        {editing || whey ? (
          <WheyForm whey={whey} onDone={() => setEditing(false)} />
        ) : (
          <div className="px-4 pt-3">
            <Button variant="secondary" className="w-full" onClick={() => setEditing(true)}>
              Add my whey
            </Button>
          </div>
        )}
      </div>
    )
  }

  const unit = splitUnit(whey.defaultUnit ?? 'scoop')
  const p = whey.perPortion!
  return (
    <div className="rounded-2xl border border-line bg-card">
      {header}
      <div className="px-4 py-3 text-sm">
        <p>{whey.name}</p>
        <p className="text-muted tabular-nums">
          1 {unit.label}
          {unit.detail ? ` (${unit.detail})` : ''}: {p.kcal} kcal · <span className="text-protein">{p.protein} g protein</span> · {p.carbs} g carbs ·{' '}
          {p.fat} g fat
        </p>
        {pinned === 0 && <p className="mt-1 text-muted">Not pinned.</p>}
      </div>
      <div className="flex border-t border-line">
        <button type="button" onClick={() => setEditing(true)} className="min-h-12 flex-1 text-accent active:bg-line/50">
          Edit
        </button>
        <button
          type="button"
          onClick={() => (pinned > 0 ? unpinWhey(db) : saveWhey(db, { name: whey.name, perScoop: p, scoopGrams: gramsOf(whey) }))}
          className="min-h-12 flex-1 border-l border-line text-muted active:bg-line/50"
        >
          {pinned > 0 ? 'Unpin' : 'Pin to meals'}
        </button>
      </div>
    </div>
  )
}

function gramsOf(whey: FoodItem): number | undefined {
  const g = /\((\d+(?:\.\d+)?) g\)/.exec(whey.defaultUnit ?? '')?.[1]
  return g ? Number(g) : undefined
}

function WheyForm({ whey, onDone }: { whey: FoodItem | null; onDone: () => void }) {
  const [name, setName] = useState(whey?.name ?? '')
  const [grams, setGrams] = useState(whey ? String(gramsOf(whey) ?? '') : '')
  const [values, setValues] = useState<Record<keyof Macros, string>>({
    kcal: whey?.perPortion ? String(whey.perPortion.kcal) : '',
    protein: whey?.perPortion ? String(whey.perPortion.protein) : '',
    carbs: whey?.perPortion ? String(whey.perPortion.carbs) : '',
    fat: whey?.perPortion ? String(whey.perPortion.fat) : '',
  })

  const perScoop: Macros = {
    kcal: parseDecimal(values.kcal),
    protein: parseDecimal(values.protein),
    carbs: parseDecimal(values.carbs),
    fat: parseDecimal(values.fat),
  }
  const g = grams.trim() ? parseDecimal(grams) : undefined
  const valid = MACROS.every((m) => !Number.isNaN(perScoop[m.key])) && (g === undefined || (!Number.isNaN(g) && g > 0))

  return (
    <form
      noValidate
      className="space-y-4 px-4 pt-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid) return
        await saveWhey(db, { name, scoopGrams: g, perScoop })
        onDone()
      }}
    >
      <Field label="Name on the tub" value={name} onChange={setName} placeholder="e.g. MuscleBlaze Biozyme" />
      <Field label="Scoop size (optional)" suffix="g" inputMode="decimal" value={grams} onChange={setGrams} />
      <div className="grid grid-cols-2 gap-3">
        {MACROS.map((m) => (
          <Field
            key={m.key}
            label={`${m.label} per scoop`}
            suffix={m.suffix}
            inputMode="decimal"
            value={values[m.key]}
            onChange={(v) => setValues((s) => ({ ...s, [m.key]: v }))}
            error={values[m.key] !== '' && Number.isNaN(perScoop[m.key]) ? 'Number' : undefined}
          />
        ))}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" className="flex-[2]" disabled={!valid}>
          Save whey
        </Button>
      </div>
    </form>
  )
}
