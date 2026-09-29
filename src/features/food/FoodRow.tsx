import { defaultServing, entryMacros, formatQty, type FoodView } from '../../engine/food'

interface Props {
  food: FoodView
  onClick: () => void
  /** Pinned items: log the default amount in one tap. */
  quick?: { qty: number; unit: string; onAdd: () => void }
}

/** Library item in a pick list: shows what one tap would log. */
export function FoodRow({ food, onClick, quick }: Props) {
  const s = quick ? { qty: quick.qty, unit: quick.unit } : defaultServing(food)
  const m = entryMacros(food.portion, food.units, s.unit, s.qty)
  const unitLabel = food.units.find((u) => u.unit === s.unit)?.label ?? s.unit
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-3 py-2 text-left active:bg-line"
      >
        <span className="min-w-0">
          <span className="block truncate">{food.name}</span>
          <span className="block text-sm text-muted">
            {formatQty(s.qty, unitLabel)}
          </span>
        </span>
        <span className="shrink-0 text-right text-sm tabular-nums">
          <span className="block">{m.kcal} kcal</span>
          <span className="block text-protein">{m.protein} g P</span>
        </span>
      </button>
      {quick && (
        <button
          type="button"
          onClick={quick.onAdd}
          aria-label={`Add ${s.qty} ${unitLabel} ${food.name}`}
          className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-2xl leading-none text-accent active:bg-accent/30"
        >
          +
        </button>
      )}
    </li>
  )
}
