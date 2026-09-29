import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ArchetypePicker } from '../../components/ArchetypePicker'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { createDish, findDishByName } from '../../db/dishes'
import { db } from '../../db/schema'
import { splitUnit, tidyDishName, type MealSlot } from '../../engine/food'
import { parseDecimal } from '../../engine/profile'
import type { Macros } from '../../engine/types'
import { SLOT_LABELS } from './slots'

type Mode = 'archetype' | 'custom'

const MACRO_FIELDS: { key: keyof Macros; label: string; suffix: string }[] = [
  { key: 'kcal', label: 'Calories', suffix: 'kcal' },
  { key: 'protein', label: 'Protein', suffix: 'g' },
  { key: 'carbs', label: 'Carbs', suffix: 'g' },
  { key: 'fat', label: 'Fat', suffix: 'g' },
]

interface Props {
  initialName: string
  slot: MealSlot
  /** Called with the dish to log next: the new one, or an existing one with the same name. */
  onReady: (foodId: string) => void
  onClose: () => void
}

/** Add a dish that isn't in the library yet, then go straight to logging it. */
export function NewDishSheet({ initialName, slot, onReady, onClose }: Props) {
  const [name, setName] = useState(() => tidyDishName(initialName))
  const [mode, setMode] = useState<Mode>('archetype')
  const [archetypeId, setArchetypeId] = useState<string>()
  const [unit, setUnit] = useState('serving')
  const [values, setValues] = useState<Record<keyof Macros, string>>({ kcal: '', protein: '', carbs: '', fat: '' })
  const [saving, setSaving] = useState(false)

  const existingId = useLiveQuery(() => findDishByName(db, name), [name])
  const existing = useLiveQuery(async () => (existingId ? db.foodItems.get(existingId) : undefined), [existingId])
  const archetype = useLiveQuery(async () => (archetypeId ? db.archetypes.get(archetypeId) : undefined), [archetypeId])

  const macros: Macros = {
    kcal: parseDecimal(values.kcal),
    protein: parseDecimal(values.protein),
    carbs: parseDecimal(values.carbs),
    fat: parseDecimal(values.fat),
  }
  const customValid = unit.trim() !== '' && MACRO_FIELDS.every((f) => !Number.isNaN(macros[f.key]))
  const canSave = name.trim() !== '' && !existing && !saving && (mode === 'archetype' ? !!archetypeId : customValid)

  const save = async () => {
    setSaving(true)
    try {
      const r =
        mode === 'archetype'
          ? await createDish(db, { name, slot, kind: 'archetype', archetypeId: archetypeId! })
          : await createDish(db, { name, slot, kind: 'custom', unit, perPortion: macros })
      onReady(r.id)
    } finally {
      setSaving(false)
    }
  }

  const tab = (m: Mode) =>
    `min-h-11 flex-1 rounded-lg text-sm ${mode === m ? 'bg-accent/15 text-accent' : 'text-muted'}`

  return (
    <BottomSheet
      title="New dish"
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={save} disabled={!canSave}>
          Save and log to {SLOT_LABELS[slot]}
        </Button>
      }
    >
      <div className="space-y-5 pt-2">
        <div>
          <Field label="Dish name" value={name} onChange={setName} autoCapitalize="words" />
          {existing && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
              <span>"{existing.name}" is already in your library.</span>
              <button type="button" onClick={() => onReady(existing.id)} className="min-h-11 shrink-0 px-2 font-medium text-accent">
                Log it
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-1 rounded-xl bg-surface p-1" role="tablist" aria-label="How to set values">
          <button type="button" role="tab" aria-selected={mode === 'archetype'} className={tab('archetype')} onClick={() => setMode('archetype')}>
            Like a mess dish
          </button>
          <button type="button" role="tab" aria-selected={mode === 'custom'} className={tab('custom')} onClick={() => setMode('custom')}>
            My own values
          </button>
        </div>

        {mode === 'archetype' ? (
          <div className="space-y-2">
            <p className="text-sm text-muted">Pick the closest kind of dish. It uses those portion sizes and values, and you can fine-tune them later.</p>
            <ArchetypePicker value={archetypeId} onChange={setArchetypeId} />
            {archetype && (
              <p className="text-sm text-muted tabular-nums">
                1 {splitUnit(archetype.defaultUnit).label} ≈ {archetype.perPortion.kcal} kcal ·{' '}
                <span className="text-protein">{archetype.perPortion.protein} g protein</span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">For home food, restaurant meals or packaged snacks. Enter the values for one unit.</p>
            <Field label="Unit" value={unit} onChange={setUnit} placeholder="serving, plate, bowl, piece" />
            <div className="grid grid-cols-2 gap-3">
              {MACRO_FIELDS.map((f) => (
                <Field
                  key={f.key}
                  label={`${f.label} per ${unit.trim() || 'unit'}`}
                  suffix={f.suffix}
                  inputMode="decimal"
                  value={values[f.key]}
                  onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                  error={values[f.key] !== '' && Number.isNaN(macros[f.key]) ? 'Number' : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
