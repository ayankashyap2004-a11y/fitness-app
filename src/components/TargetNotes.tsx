import type { Targets } from '../engine/targets'

export function TargetNotes({ targets }: { targets: Targets }) {
  const { notes } = targets
  const items: { tone: 'warn' | 'info'; text: string }[] = []

  if (notes.flooredToBmr)
    items.push({
      tone: 'info',
      text: `Your goal settings would put you below your BMR (${targets.bmr} kcal), so the target is held at BMR. Eating less than this isn't recommended.`,
    })
  if (notes.aggressiveDeficit)
    items.push({
      tone: 'warn',
      text: 'Aggressive (−750 kcal) risks losing more muscle. Keep protein high and consider Moderate.',
    })
  if (notes.lowCarbs)
    items.push({
      tone: 'info',
      text: `Carbs are below 3 g/kg (${Math.round(3 * targets.weightKg)} g) for muscle gain. That can limit training performance.`,
    })

  if (items.length === 0) return null
  return (
    <ul className="space-y-2">
      {items.map((n) => (
        <li
          key={n.text}
          className={`rounded-xl border px-3 py-2 text-sm ${
            n.tone === 'warn' ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-line bg-card text-muted'
          }`}
        >
          {n.text}
        </li>
      ))}
    </ul>
  )
}
