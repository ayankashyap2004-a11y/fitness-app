import { useState } from 'react'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { setUserOverride } from '../../db/food'
import { db } from '../../db/schema'
import type { FoodView } from '../../engine/food'
import { parseDecimal } from '../../engine/profile'
import type { Macros } from '../../engine/types'

const FIELDS: { key: keyof Macros; label: string; suffix: string }[] = [
  { key: 'kcal', label: 'Calories', suffix: 'kcal' },
  { key: 'protein', label: 'Protein', suffix: 'g' },
  { key: 'carbs', label: 'Carbs', suffix: 'g' },
  { key: 'fat', label: 'Fat', suffix: 'g' },
]

interface Props {
  food: FoodView
  onDone: () => void
}

/** Edit a dish once when it runs heavier or lighter than its archetype. */
export function DishValuesEditor({ food, onDone }: Props) {
  const [values, setValues] = useState<Record<keyof Macros, string>>({
    kcal: String(food.portion.kcal),
    protein: String(food.portion.protein),
    carbs: String(food.portion.carbs),
    fat: String(food.portion.fat),
  })

  const parsed: Macros = {
    kcal: parseDecimal(values.kcal),
    protein: parseDecimal(values.protein),
    carbs: parseDecimal(values.carbs),
    fat: parseDecimal(values.fat),
  }
  const valid = FIELDS.every((f) => !Number.isNaN(parsed[f.key]))
  const unit = food.units[0]!

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-3">
      <p className="text-sm text-muted">
        Values per 1 {unit.label}
        {unit.detail ? ` (${unit.detail})` : ''}. They apply to new entries and to entries you edit; saved days stay as they were.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            suffix={f.suffix}
            inputMode="decimal"
            value={values[f.key]}
            onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
            error={Number.isNaN(parsed[f.key]) ? 'Number' : undefined}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {food.edited && (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={async () => {
              await setUserOverride(db, food.id, null)
              onDone()
            }}
          >
            Reset
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!valid}
          onClick={async () => {
            await setUserOverride(db, food.id, parsed)
            onDone()
          }}
        >
          Save values
        </Button>
      </div>
    </div>
  )
}
