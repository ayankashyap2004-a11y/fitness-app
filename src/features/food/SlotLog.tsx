import { addOil, OIL_FOOD_ID } from '../../db/food'
import type { FoodLibrary } from '../../db/hooks'
import { db } from '../../db/schema'
import type { FoodLogEntry } from '../../db/types'
import { sumMacros, type MealSlot } from '../../engine/food'
import { SLOT_LABELS } from './slots'

interface Props {
  date: string
  slot: MealSlot
  entries: FoodLogEntry[]
  library: FoodLibrary
  onEdit: (entry: FoodLogEntry) => void
}

export function SlotLog({ date, slot, entries, library, onEdit }: Props) {
  const total = sumMacros(entries.map((e) => e.macros))
  const oil = library.byId.get(OIL_FOOD_ID)

  return (
    <div className="rounded-2xl border border-line bg-card">
      {entries.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted">Nothing logged for {SLOT_LABELS[slot].toLowerCase()} yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((e) => {
            const food = library.byId.get(e.foodId)
            const unit = food?.units.find((u) => u.unit === e.unit)?.label ?? e.unit
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onEdit(e)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left active:bg-line/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{food?.name ?? e.foodId}</span>
                    <span className="block text-sm text-muted">
                      {e.qty} {unit}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm tabular-nums">
                    <span className="block">{e.macros.kcal} kcal</span>
                    <span className="block text-protein">{e.macros.protein} g P</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-line py-1 pr-2 pl-4">
        <span className="text-sm text-muted tabular-nums">
          {total.kcal} kcal · <span className="text-protein">{total.protein} g P</span>
        </span>
        {oil && (
          <button
            type="button"
            onClick={() => addOil(db, date, slot, oil)}
            className="min-h-11 rounded-lg px-3 text-sm text-accent active:bg-line"
            title="About 45 kcal, 5 g fat"
          >
            +1 tsp oil
          </button>
        )}
      </div>
    </div>
  )
}
