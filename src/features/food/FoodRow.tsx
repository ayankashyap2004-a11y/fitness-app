import { defaultServing, entryMacros, type FoodView } from '../../engine/food'

/** Library item in a pick list: shows what one tap would log. */
export function FoodRow({ food, onClick }: { food: FoodView; onClick: () => void }) {
  const s = defaultServing(food)
  const m = entryMacros(food.portion, food.units, s.unit, s.qty)
  const unitLabel = food.units.find((u) => u.unit === s.unit)?.label ?? s.unit
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left active:bg-line"
      >
        <span className="min-w-0">
          <span className="block truncate">{food.name}</span>
          <span className="block text-sm text-muted">
            {s.qty} {unitLabel}
          </span>
        </span>
        <span className="shrink-0 text-right text-sm tabular-nums">
          <span className="block">{m.kcal} kcal</span>
          <span className="block text-protein">{m.protein} g P</span>
        </span>
      </button>
    </li>
  )
}
