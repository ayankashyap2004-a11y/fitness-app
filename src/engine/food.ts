import type { Macros } from './types'

export type MealSlot = 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'dessert'
export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'snacks', 'dinner', 'dessert']

export interface AltUnitLike {
  unit: string
  /** Multiplier on the default portion (e.g. ladle = 0.5 katori). */
  factor: number
}

export interface UnitOption {
  /** Stored on log entries; the seed's unit string. */
  unit: string
  /** Short chip label, e.g. 'katori'. */
  label: string
  /** Parenthetical from the seed, e.g. '~150 g'. */
  detail?: string
  factor: number
}

/** 'katori (~150 g)' → { label: 'katori', detail: '~150 g' }; 'per egg used' → 'egg used' */
export function splitUnit(unit: string): { label: string; detail?: string } {
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(unit)
  const { label, detail } = m ? { label: m[1]!, detail: m[2] } : { label: unit, detail: undefined }
  const short = label.replace(/^per\s+/i, '')
  return detail ? { label: short, detail } : { label: short }
}

export function unitOptions(defaultUnit: string, altUnits: readonly AltUnitLike[] = []): UnitOption[] {
  return [
    { unit: defaultUnit, ...splitUnit(defaultUnit), factor: 1 },
    ...altUnits.map((u) => ({ unit: u.unit, ...splitUnit(u.unit), factor: u.factor })),
  ]
}

/** Field-wise precedence: user edit > dish override > archetype. */
export function resolvePortion(base: Macros, override?: Partial<Macros>, userOverride?: Partial<Macros>): Macros {
  return { ...base, ...override, ...userOverride }
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function scaleMacros(portion: Macros, multiplier: number): Macros {
  return {
    kcal: Math.round(portion.kcal * multiplier),
    protein: round1(portion.protein * multiplier),
    carbs: round1(portion.carbs * multiplier),
    fat: round1(portion.fat * multiplier),
  }
}

/** Macros for `qty` of `unit`. Unknown units fall back to the default portion. */
export function entryMacros(portion: Macros, units: readonly UnitOption[], unit: string, qty: number): Macros {
  const factor = units.find((u) => u.unit === unit)?.factor ?? 1
  return scaleMacros(portion, factor * qty)
}

export const QTY_STEP = 0.5

/** Snap to the 0.5 grid, never below `min`. */
export function snapQty(n: number, min = QTY_STEP): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.round(n / QTY_STEP) * QTY_STEP)
}

export function sumMacros(items: readonly Macros[]): Macros {
  const total = items.reduce(
    (s, m) => ({ kcal: s.kcal + m.kcal, protein: s.protein + m.protein, carbs: s.carbs + m.carbs, fat: s.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
  return { kcal: Math.round(total.kcal), protein: round1(total.protein), carbs: round1(total.carbs), fat: round1(total.fat) }
}

/** Default slot for the time of day, matching mess timings. */
export function slotForTime(hour: number, minute = 0): MealSlot {
  const t = hour * 60 + minute
  if (t < 10 * 60 + 30) return 'breakfast'
  if (t < 15 * 60) return 'lunch'
  if (t < 19 * 60) return 'snacks'
  return 'dinner'
}

/** A food item merged with its archetype, ready to show and log. */
export interface FoodView {
  id: string
  name: string
  source: 'bundled' | 'personal' | 'off' | 'mess'
  searchKeys: string[]
  portion: Macros
  units: UnitOption[]
  archetypeName?: string
  /** Archetype group, e.g. 'Non-veg'. */
  group?: string
  /** Values checked against a published source. */
  sourced: boolean
  /** The user has overridden at least one value. */
  edited: boolean
  slots: MealSlot[]
  timesOnMenu: number
  lastQty?: number
  lastUnit?: string
}

export interface FoodItemLike {
  id: string
  name: string
  source: FoodView['source']
  searchKeys: string[]
  archetypeId?: string
  override?: Partial<Macros>
  userOverride?: Partial<Macros>
  perPortion?: Macros
  defaultUnit?: string
  servingUnits: AltUnitLike[]
  slots?: MealSlot[]
  timesOnMenu?: number
  sourced?: boolean
  lastQty?: number
  lastUnit?: string
}

export interface ArchetypeLike {
  name: string
  group?: string
  defaultUnit: string
  perPortion: Macros
  altUnits: AltUnitLike[]
  sourced: boolean
}

/** Returns null if a mess dish points at a missing archetype. */
export function resolveFood(item: FoodItemLike, archetype?: ArchetypeLike): FoodView | null {
  const base = archetype?.perPortion ?? item.perPortion
  const defaultUnit = archetype?.defaultUnit ?? item.defaultUnit
  if (!base || !defaultUnit) return null
  const hasUser = !!item.userOverride && Object.keys(item.userOverride).length > 0
  return {
    id: item.id,
    name: item.name,
    source: item.source,
    searchKeys: item.searchKeys,
    portion: resolvePortion(base, item.override, item.userOverride),
    units: unitOptions(defaultUnit, archetype ? archetype.altUnits : item.servingUnits),
    archetypeName: archetype?.name,
    group: archetype?.group,
    sourced: !hasUser && !item.override && (archetype?.sourced ?? item.sourced ?? false),
    edited: hasUser,
    slots: item.slots ?? [],
    timesOnMenu: item.timesOnMenu ?? 0,
    lastQty: item.lastQty,
    lastUnit: item.lastUnit,
  }
}

/** Starting quantity and unit when adding: last used if still valid, else 1 default portion. */
export function defaultServing(food: Pick<FoodView, 'units' | 'lastQty' | 'lastUnit'>): { qty: number; unit: string } {
  const lastUnitValid = food.lastUnit !== undefined && food.units.some((u) => u.unit === food.lastUnit)
  return {
    qty: food.lastQty !== undefined && lastUnitValid ? food.lastQty : 1,
    unit: lastUnitValid ? food.lastUnit! : food.units[0]!.unit,
  }
}

/** Case-insensitive, whitespace-insensitive key used to match names to dishes. */
export function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** 'egg fried rice' → 'Egg Fried Rice'. Leaves names with any capitals as typed. */
export function tidyDishName(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ')
  return t === t.toLowerCase() ? t.replace(/(^|\s)(\p{L})/gu, (_, sp: string, c: string) => sp + c.toUpperCase()) : t
}

export function searchKeysFor(name: string, aliases: readonly string[] = []): string[] {
  return [...new Set([name, ...aliases].map(normalizeName).filter(Boolean))]
}
