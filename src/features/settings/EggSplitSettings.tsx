import { Stepper } from '../../components/Stepper'
import { setPinnedQty } from '../../db/food'
import { useFoodLibrary, usePinned } from '../../db/hooks'
import { db } from '../../db/schema'

/** Default quantities for the Usual breakfast sheet (e.g. 2 boiled + 2-egg bhurji). */
export function EggSplitSettings() {
  const pinned = usePinned()
  const library = useFoodLibrary()
  if (!pinned || !library) return null

  const rows = pinned.filter((p) => p.slot === 'breakfast')
  if (rows.length === 0) return null
  const totalEggs = rows.reduce((s, p) => s + p.defaultQty, 0)

  return (
    <div className="rounded-2xl border border-line bg-card">
      <div className="px-4 pt-3">
        <h2 className="font-medium">Usual breakfast</h2>
        <p className="text-sm text-muted">Starting amounts for the Usual breakfast button. {totalEggs} eggs a day.</p>
      </div>
      <ul className="divide-y divide-line px-4">
        {rows.map((p) => {
          const food = library.byId.get(p.foodId)
          if (!food) return null
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate">{food.name}</span>
                <span className="block text-sm text-muted">{food.units[0]!.label}</span>
              </span>
              <Stepper size="sm" min={0} label={`${food.name} default`} value={p.defaultQty} onChange={(q) => setPinnedQty(db, p.id!, q)} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
