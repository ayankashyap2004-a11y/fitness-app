import { useDayLog, useFoodLibrary } from '../../db/hooks'
import { dinnerSummary, proteinLeft } from '../../engine/dinner'
import { sumMacros } from '../../engine/food'

interface Props {
  today: string
  proteinTarget: number
}

/**
 * Dinner at a glance, built only from what's been logged at dinner. Hidden until then:
 * the app never assumes what tonight's dinner will be.
 */
export function DinnerCard({ today, proteinTarget }: Props) {
  const log = useDayLog(today)
  const library = useFoodLibrary()
  if (!log || !library) return null

  const dinner = log.filter((e) => e.mealSlot === 'dinner')
  const summary = dinnerSummary(dinner.map((e) => ({ name: library.byId.get(e.foodId)?.name ?? e.foodId, protein: e.macros.protein })))
  if (!summary) return null

  const left = proteinLeft(proteinTarget, sumMacros(log.map((e) => e.macros)).protein)

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-sm text-muted">Dinner</p>
      <p className="text-lg font-semibold">{summary.main.name}</p>
      <p className="text-sm text-muted tabular-nums">
        {dinner.length > 1 ? `+ ${dinner.length - 1} more · ` : ''}
        <span className="text-protein">{summary.protein} g protein</span> at dinner
      </p>
      <p className="mt-3 border-t border-line pt-3 text-sm">
        {left > 0 ? (
          <>
            <span className="font-semibold text-protein tabular-nums">{left} g protein</span> left for today.
          </>
        ) : (
          <span className="text-muted">Protein target reached for today.</span>
        )}
      </p>
    </div>
  )
}
