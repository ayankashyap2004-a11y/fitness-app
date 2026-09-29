import { useDayLog, useFoodLibrary, useMenuDay } from '../../db/hooks'
import { sumMacros, type FoodView } from '../../engine/food'
import { planTonight, proteinBeforeDinner } from '../../engine/menu'

/** Veg nights with this much protein still to find get a nudge. */
const VEG_NUDGE_G = 30

interface Props {
  today: string
  proteinTarget: number
}

/** PRD §4.3 protein planning: tonight's dinner main and protein to get before dinner. */
export function TonightCard({ today, proteinTarget }: Props) {
  const menu = useMenuDay(today)
  const library = useFoodLibrary()
  const log = useDayLog(today)
  if (!menu || !library || !log) return null

  const dinner = (menu.dinner ?? []).map((id) => library.byId.get(id)).filter((f): f is FoodView => !!f)
  const plan = planTonight(dinner.map((f) => ({ name: f.name, protein: f.portion.protein, nonVeg: f.group === 'Non-veg' })))
  if (!plan) return null

  const dinnerLogged = log.some((e) => e.mealSlot === 'dinner')
  const eatenOutsideDinner = sumMacros(log.filter((e) => e.mealSlot !== 'dinner').map((e) => e.macros)).protein
  const needed = proteinBeforeDinner(proteinTarget, eatenOutsideDinner, plan.main.protein)

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-sm text-muted">Tonight</p>
      <p className="text-lg font-semibold">{plan.isVeg ? 'Veg' : plan.main.name}</p>
      <p className="text-sm text-muted">
        {plan.isVeg ? `Best protein: ${plan.main.name}` : 'Main'} · <span className="text-protein">{plan.main.protein} g</span> per portion
      </p>
      {!dinnerLogged && (
        <p className="mt-3 border-t border-line pt-3 text-sm">
          {needed > 0 ? (
            <>
              Get about <span className="font-semibold text-protein tabular-nums">{needed} g protein</span> before dinner.
              {plan.isVeg && needed >= VEG_NUDGE_G && (
                <span className="text-muted"> Veg night: have your whey, or pick the paneer, soya or legume dish.</span>
              )}
            </>
          ) : (
            <span className="text-muted">On track: tonight's main covers the rest of your protein.</span>
          )}
        </p>
      )}
    </div>
  )
}
