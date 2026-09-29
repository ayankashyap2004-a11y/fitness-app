import { useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { Stepper } from '../../components/Stepper'
import { addEntry, deleteEntry, updateEntry } from '../../db/food'
import { db } from '../../db/schema'
import type { FoodLogEntry } from '../../db/types'
import { MEAL_SLOTS, defaultServing, entryMacros, type FoodView, type MealSlot } from '../../engine/food'
import { DishValuesEditor } from './DishValuesEditor'
import { SLOT_LABELS } from './slots'

type Target = { mode: 'add'; slot: MealSlot } | { mode: 'edit'; entry: FoodLogEntry }

interface Props {
  food: FoodView
  date: string
  target: Target
  onClose: () => void
}

export function AddFoodSheet({ food, date, target, onClose }: Props) {
  const initial =
    target.mode === 'edit' ? { qty: target.entry.qty, unit: target.entry.unit } : defaultServing(food)
  const [qty, setQty] = useState(initial.qty)
  const [unit, setUnit] = useState(initial.unit)
  const [slot, setSlot] = useState<MealSlot>(target.mode === 'edit' ? target.entry.mealSlot : target.slot)
  const [editingValues, setEditingValues] = useState(false)

  // An entry may use a unit the food no longer offers; keep it selectable.
  const units = food.units.some((u) => u.unit === unit) ? food.units : [...food.units, { unit, label: unit, factor: 1 }]
  const current = units.find((u) => u.unit === unit)
  const macros = entryMacros(food.portion, units, unit, qty)

  const save = async () => {
    if (target.mode === 'edit') await updateEntry(db, target.entry.id!, food, slot, { qty, unit })
    else await addEntry(db, date, slot, food, { qty, unit })
    onClose()
  }

  const badge = food.edited
    ? { text: 'Your values', cls: 'text-accent' }
    : food.sourced
      ? { text: '✓ Checked', cls: 'text-accent' }
      : { text: 'Estimate', cls: 'text-muted' }

  return (
    <BottomSheet
      title={food.name}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          {target.mode === 'edit' && (
            <Button
              variant="secondary"
              className="flex-1 text-red-300"
              onClick={async () => {
                await deleteEntry(db, target.entry.id!)
                onClose()
              }}
            >
              Delete
            </Button>
          )}
          <Button className="flex-[2]" onClick={save} disabled={editingValues}>
            {target.mode === 'edit' ? 'Save changes' : `Add to ${SLOT_LABELS[slot]}`}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted">
        {food.source === 'mess' ? `Mess · ${food.archetypeName}` : 'Library'} · <span className={badge.cls}>{badge.text}</span>
      </p>

      <div className="mt-4 space-y-5">
        {units.length > 1 && (
          <fieldset>
            <legend className="mb-1.5 text-sm text-muted">Unit</legend>
            <div className="flex flex-wrap gap-2">
              {units.map((u) => (
                <button
                  key={u.unit}
                  type="button"
                  aria-pressed={u.unit === unit}
                  onClick={() => setUnit(u.unit)}
                  className={`min-h-11 rounded-full border px-4 text-sm ${
                    u.unit === unit ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-surface'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Quantity</p>
            <p className="text-base">
              {current?.label}
              {current?.detail && <span className="text-sm text-muted"> ({current.detail})</span>}
            </p>
          </div>
          <Stepper value={qty} onChange={setQty} label="Quantity" />
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-surface p-3 text-center">
          <Macro label="kcal" value={macros.kcal} />
          <Macro label="protein" value={macros.protein} unit="g" highlight />
          <Macro label="carbs" value={macros.carbs} unit="g" />
          <Macro label="fat" value={macros.fat} unit="g" />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm text-muted">Meal</legend>
          <div className="grid grid-cols-5 gap-1">
            {MEAL_SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === slot}
                onClick={() => setSlot(s)}
                className={`min-h-11 rounded-lg text-xs ${s === slot ? 'bg-accent/15 text-accent' : 'bg-surface text-muted'}`}
              >
                {SLOT_LABELS[s]}
              </button>
            ))}
          </div>
        </fieldset>

        {editingValues ? (
          <DishValuesEditor food={food} onDone={() => setEditingValues(false)} />
        ) : (
          <button type="button" onClick={() => setEditingValues(true)} className="min-h-11 text-sm text-accent">
            {food.edited ? 'Edit your values' : 'Edit values for this dish'}
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

function Macro({ label, value, unit = '', highlight = false }: { label: string; value: number; unit?: string; highlight?: boolean }) {
  return (
    <div>
      <p className={`text-lg font-semibold tabular-nums ${highlight ? 'text-protein' : ''}`}>
        {value}
        {unit}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}
