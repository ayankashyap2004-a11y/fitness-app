import { useMemo, useState } from 'react'
import { useDayLog, useFoodLibrary, useMenuDay, usePinned, useRecentInSlot, useToday } from '../../db/hooks'
import { OIL_FOOD_ID } from '../../db/food'
import type { FoodLogEntry } from '../../db/types'
import { addDays } from '../../engine/dates'
import { MEAL_SLOTS, slotForTime, sumMacros, type FoodView, type MealSlot } from '../../engine/food'
import { searchFoods } from '../../engine/search'
import { AddFoodSheet } from './AddFoodSheet'
import { FoodRow } from './FoodRow'
import { NewDishSheet } from './NewDishSheet'
import { SLOT_LABELS } from './slots'
import { SlotLog } from './SlotLog'
import { UsualBreakfastSheet } from './UsualBreakfastSheet'

type Sheet =
  | { kind: 'add'; foodId: string }
  | { kind: 'edit'; entry: FoodLogEntry }
  | { kind: 'breakfast' }
  | { kind: 'new'; name: string }

const SUGGESTION_LIMIT = 12

export function FoodScreen() {
  const today = useToday()
  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState<MealSlot>(() => {
    const now = new Date()
    return slotForTime(now.getHours(), now.getMinutes())
  })
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<Sheet | null>(null)

  const library = useFoodLibrary()
  const log = useDayLog(date)
  const pinned = usePinned()
  const recent = useRecentInSlot(slot, today)
  const menu = useMenuDay(date)

  const suggestions = useMemo(() => {
    if (!library || !pinned || !recent || !menu) return null
    const menuFoods = (menu[slot] ?? []).map((id) => library.byId.get(id)).filter((f): f is FoodView => !!f)
    const pinnedFoods = pinned
      .filter((p) => p.slot === slot || p.slot === 'any')
      .map((p) => library.byId.get(p.foodId))
      .filter((f): f is FoodView => !!f)
    const seen = new Set([...menuFoods.map((f) => f.id), ...pinnedFoods.map((f) => f.id), OIL_FOOD_ID])
    const recentFoods = recent
      .map((id) => library.byId.get(id))
      .filter((f): f is FoodView => !!f && !seen.has(f.id))
      .slice(0, SUGGESTION_LIMIT)
    recentFoods.forEach((f) => seen.add(f.id))
    const common = library.foods
      .filter((f) => f.source === 'mess' && f.slots.includes(slot) && f.timesOnMenu > 0 && !seen.has(f.id))
      .sort((a, b) => b.timesOnMenu - a.timesOnMenu || a.name.localeCompare(b.name))
      .slice(0, SUGGESTION_LIMIT)
    return { menuFoods, pinnedFoods, recentFoods, common }
  }, [library, pinned, recent, menu, slot])

  if (!library || !log || !pinned || !menu || !suggestions) return null

  const results = query.trim() ? searchFoods(library.foods, query) : null
  const bySlot = (s: MealSlot) => log.filter((e) => e.mealSlot === s)
  const dayTotal = sumMacros(log.map((e) => e.macros))
  const menuBreakfastIds = menu.breakfast ?? []
  const suggestedMessId =
    menuBreakfastIds[0] ?? recent?.find((id) => library.byId.get(id)?.source === 'mess' && !pinned.some((p) => p.foodId === id))

  const open = (food: FoodView) => setSheet({ kind: 'add', foodId: food.id })
  const sheetFood =
    sheet?.kind === 'add' ? library.byId.get(sheet.foodId) : sheet?.kind === 'edit' ? library.byId.get(sheet.entry.foodId) : undefined

  return (
    <section className="space-y-4 px-4 pt-4">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => setDate(addDays(date, -1))}
          className="h-11 w-11 rounded-xl text-2xl text-muted active:bg-line"
        >
          ‹
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold">{dayLabel(date, today)}</h1>
          <p className="text-sm text-muted tabular-nums">
            {dayTotal.kcal} kcal · <span className="text-protein">{dayTotal.protein} g protein</span>
          </p>
        </div>
        <button
          type="button"
          aria-label="Next day"
          disabled={date >= today}
          onClick={() => setDate(addDays(date, 1))}
          className="h-11 w-11 rounded-xl text-2xl text-muted active:bg-line disabled:opacity-20"
        >
          ›
        </button>
      </header>

      <div className="grid grid-cols-5 gap-1" role="tablist" aria-label="Meal">
        {MEAL_SLOTS.map((s) => {
          const kcal = sumMacros(bySlot(s).map((e) => e.macros)).kcal
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === slot}
              onClick={() => setSlot(s)}
              className={`min-h-14 rounded-xl px-1 text-xs ${s === slot ? 'bg-accent/15 text-accent' : 'bg-card text-muted'}`}
            >
              <span className="block font-medium">{SLOT_LABELS[s]}</span>
              <span className="block tabular-nums">{kcal > 0 ? kcal : '–'}</span>
            </button>
          )
        })}
      </div>

      <input
        type="search"
        placeholder="Search what you ate, e.g. dal, paneer"
        aria-label="Search food"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-h-12 w-full rounded-xl border border-line bg-card px-4 text-base outline-none focus:border-accent"
      />

      {results ? (
        <>
          {results.length > 0 ? (
            <FoodList foods={results} onPick={open} />
          ) : (
            <p className="px-1 text-sm text-muted">Nothing called "{query.trim()}" yet.</p>
          )}
          <AddNewButton label={`Add "${query.trim()}" as a new dish`} onClick={() => setSheet({ kind: 'new', name: query })} />
        </>
      ) : (
        <>
          <SlotLog date={date} slot={slot} entries={bySlot(slot)} library={library} onEdit={(entry) => setSheet({ kind: 'edit', entry })} />

          {slot === 'breakfast' && (
            <button
              type="button"
              onClick={() => setSheet({ kind: 'breakfast' })}
              className="min-h-14 w-full rounded-2xl bg-accent font-semibold text-surface active:opacity-80"
            >
              Usual breakfast
            </button>
          )}

          {suggestions.menuFoods.length > 0 && (
            <FoodList title={`On the menu · ${SLOT_LABELS[slot].toLowerCase()}`} foods={suggestions.menuFoods} onPick={open} />
          )}
          {suggestions.pinnedFoods.length > 0 && <FoodList title="Pinned" foods={suggestions.pinnedFoods} onPick={open} />}
          {suggestions.recentFoods.length > 0 && <FoodList title="Recent" foods={suggestions.recentFoods} onPick={open} />}
          {suggestions.common.length > 0 && (
            <FoodList title={`Common at ${SLOT_LABELS[slot].toLowerCase()}`} foods={suggestions.common} onPick={open} />
          )}
          <AddNewButton label="Add a new dish" onClick={() => setSheet({ kind: 'new', name: '' })} />
        </>
      )}

      {sheet?.kind === 'breakfast' && (
        <UsualBreakfastSheet
          date={date}
          library={library}
          pinned={pinned}
          suggestedMessId={suggestedMessId}
          menuIds={menuBreakfastIds}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'new' && (
        <NewDishSheet
          initialName={sheet.name}
          slot={slot}
          onReady={(foodId) => setSheet({ kind: 'add', foodId })}
          onClose={() => setSheet(null)}
        />
      )}
      {(sheet?.kind === 'add' || sheet?.kind === 'edit') && sheetFood && (
        <AddFoodSheet
          key={sheet.kind === 'edit' ? `e${sheet.entry.id}` : `a${sheet.foodId}`}
          food={sheetFood}
          date={date}
          target={sheet.kind === 'edit' ? { mode: 'edit', entry: sheet.entry } : { mode: 'add', slot }}
          onClose={() => {
            setSheet(null)
            setQuery('')
          }}
        />
      )}
    </section>
  )
}

function AddNewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-dashed border-line px-4 text-left text-accent active:bg-line/50"
    >
      <span className="text-xl leading-none">+</span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}

function FoodList({ title, foods, onPick }: { title?: string; foods: FoodView[]; onPick: (f: FoodView) => void }) {
  return (
    <div>
      {title && <h2 className="mb-1 px-1 text-sm font-medium text-muted">{title}</h2>}
      <ul className="-mx-1 rounded-2xl border border-line bg-card p-1">
        {foods.map((f) => (
          <FoodRow key={f.id} food={f} onClick={() => onPick(f)} />
        ))}
      </ul>
    </div>
  )
}

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDays(today, -1)) return 'Yesterday'
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
