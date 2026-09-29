import { useMemo, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { Stepper } from '../../components/Stepper'
import { addMany, type Serving } from '../../db/food'
import type { FoodLibrary } from '../../db/hooks'
import { db } from '../../db/schema'
import type { PinnedItem } from '../../db/types'
import { defaultServing, entryMacros, sumMacros, type FoodView } from '../../engine/food'
import { searchFoods } from '../../engine/search'

interface Props {
  date: string
  library: FoodLibrary
  pinned: PinnedItem[]
  /** Best guess for today's mess breakfast item: the menu's first, else the most logged. */
  suggestedMessId?: string
  /** Today's menu breakfast items, listed first in the picker. */
  menuIds: string[]
  onClose: () => void
}

interface Row {
  food: FoodView
  serving: Serving
}

export function UsualBreakfastSheet({ date, library, pinned, suggestedMessId, menuIds, onClose }: Props) {
  const eggRows = useMemo(
    () =>
      pinned
        .filter((p) => p.slot === 'breakfast')
        .flatMap((p): Row[] => {
          const food = library.byId.get(p.foodId)
          return food ? [{ food, serving: { qty: p.defaultQty, unit: p.unit ?? food.units[0]!.unit } }] : []
        }),
    [pinned, library],
  )
  const [eggs, setEggs] = useState(eggRows)

  const initialMess = suggestedMessId ? library.byId.get(suggestedMessId) : undefined
  const [mess, setMess] = useState<Row | null>(initialMess ? { food: initialMess, serving: defaultServing(initialMess) } : null)
  const [picking, setPicking] = useState(!initialMess)

  const rows = mess ? [...eggs, mess] : eggs
  const total = sumMacros(rows.map((r) => entryMacros(r.food.portion, r.food.units, r.serving.unit, r.serving.qty)))

  const save = async () => {
    await addMany(db, date, 'breakfast', rows)
    onClose()
  }

  return (
    <BottomSheet
      title="Usual breakfast"
      onClose={onClose}
      footer={
        <div className="space-y-2">
          <p className="text-center text-sm text-muted tabular-nums">
            {total.kcal} kcal · <span className="text-protein">{total.protein} g protein</span>
          </p>
          <Button className="w-full" onClick={save} disabled={total.kcal === 0}>
            Log breakfast
          </Button>
        </div>
      }
    >
      <ul className="divide-y divide-line">
        {eggs.map((r, i) => (
          <li key={r.food.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate">{r.food.name}</p>
              <p className="text-sm text-muted">{r.food.units[0]!.label}</p>
            </div>
            <Stepper
              size="sm"
              min={0}
              label={r.food.name}
              value={r.serving.qty}
              onChange={(qty) => setEggs((rs) => rs.map((x, j) => (j === i ? { ...x, serving: { ...x.serving, qty } } : x)))}
            />
          </li>
        ))}

        <li className="py-3">
          {mess && !picking ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate">{mess.food.name}</p>
                  <button type="button" className="min-h-8 text-sm text-accent" onClick={() => setPicking(true)}>
                    Change mess item
                  </button>
                </div>
                <Stepper
                  size="sm"
                  min={0}
                  label={mess.food.name}
                  value={mess.serving.qty}
                  onChange={(qty) => setMess({ ...mess, serving: { ...mess.serving, qty } })}
                />
              </div>
              {mess.food.units.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {mess.food.units.map((u) => (
                    <button
                      key={u.unit}
                      type="button"
                      aria-pressed={u.unit === mess.serving.unit}
                      onClick={() => setMess({ ...mess, serving: { ...mess.serving, unit: u.unit } })}
                      className={`min-h-11 rounded-full border px-4 text-sm ${
                        u.unit === mess.serving.unit ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-surface'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : picking ? (
            <MessPicker
              library={library}
              menuIds={menuIds}
              onPick={(food) => {
                setMess({ food, serving: defaultServing(food) })
                setPicking(false)
              }}
              onSkip={() => {
                setMess(null)
                setPicking(false)
              }}
            />
          ) : (
            <button type="button" className="min-h-11 text-sm text-accent" onClick={() => setPicking(true)}>
              + Add today's mess item
            </button>
          )}
        </li>
      </ul>
    </BottomSheet>
  )
}

interface PickerProps {
  library: FoodLibrary
  menuIds: string[]
  onPick: (f: FoodView) => void
  onSkip: () => void
}

function MessPicker({ library, menuIds, onPick, onSkip }: PickerProps) {
  const [q, setQ] = useState('')
  const breakfastDishes = useMemo(() => {
    const onMenu = menuIds.map((id) => library.byId.get(id)).filter((f): f is FoodView => !!f)
    const common = library.foods
      .filter((f) => f.source === 'mess' && f.slots.includes('breakfast') && f.timesOnMenu > 0 && !menuIds.includes(f.id))
      .sort((a, b) => b.timesOnMenu - a.timesOnMenu)
    return [...onMenu, ...common]
  }, [library, menuIds])
  const list = q.trim() ? searchFoods(library.foods, q, 12) : breakfastDishes.slice(0, 12)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Today's mess item</p>
        <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={onSkip}>
          Skip
        </button>
      </div>
      <input
        type="search"
        placeholder="Search, e.g. poha"
        aria-label="Search mess item"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base outline-none focus:border-accent"
      />
      <ul className="space-y-1">
        {list.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onPick(f)}
              className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left active:bg-line"
            >
              <span>
                {f.name}
                {menuIds.includes(f.id) && <span className="ml-2 text-xs text-accent">on menu</span>}
              </span>
              <span className="text-sm text-muted tabular-nums">{f.portion.kcal} kcal</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
