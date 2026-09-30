import { MEAL_SLOTS, normalizeName, type MealSlot } from './food'

export { normalizeName }

export interface MenuDayInput {
  date: string
  slots: Record<MealSlot, string[]>
}

export interface ParsedMenu {
  weekStart?: string
  days: MenuDayInput[]
}

export type ParseResult = { ok: true; menu: ParsedMenu } | { ok: false; errors: string[] }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRealDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y!, m! - 1, d!)
  return dt.getFullYear() === y && dt.getMonth() === m! - 1 && dt.getDate() === d
}

/** Accepts raw JSON or JSON wrapped in a ```json fence, as pasted from a chat. */
export function parseMenuText(text: string): ParseResult {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const body = (fenced ? fenced[1]! : text).trim()
  if (!body) return { ok: false, errors: ['Paste the menu JSON first.'] }
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return { ok: false, errors: ["That isn't valid JSON. Check it was copied in full."] }
  }
  return parseMenu(data)
}

/** Validates the PRD §4.3 format. Missing slots are treated as empty. */
export function parseMenu(data: unknown): ParseResult {
  const errors: string[] = []
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ok: false, errors: ['Expected an object with "days".'] }
  const obj = data as Record<string, unknown>

  const weekStart = typeof obj.weekStart === 'string' ? obj.weekStart : undefined
  if (weekStart !== undefined && !isRealDate(weekStart)) errors.push(`weekStart "${weekStart}" isn't a YYYY-MM-DD date.`)

  if (!Array.isArray(obj.days) || obj.days.length === 0) return { ok: false, errors: [...errors, '"days" must be a non-empty list.'] }

  const seen = new Set<string>()
  const days: MenuDayInput[] = []
  obj.days.forEach((raw, i) => {
    const label = `Day ${i + 1}`
    if (typeof raw !== 'object' || raw === null) {
      errors.push(`${label} isn't an object.`)
      return
    }
    const day = raw as Record<string, unknown>
    const date = day.date
    if (typeof date !== 'string' || !isRealDate(date)) {
      errors.push(`${label}: "date" must be YYYY-MM-DD.`)
      return
    }
    if (seen.has(date)) {
      errors.push(`${date} appears twice.`)
      return
    }
    seen.add(date)

    const slots = {} as Record<MealSlot, string[]>
    for (const slot of MEAL_SLOTS) {
      const v = day[slot]
      if (v === undefined) {
        slots[slot] = []
      } else if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
        errors.push(`${date}: "${slot}" must be a list of dish names.`)
        slots[slot] = []
      } else {
        const names = (v as string[]).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean)
        // De-duplicate within a slot, keeping the first spelling.
        const keys = new Set<string>()
        slots[slot] = names.filter((n) => {
          const k = normalizeName(n)
          if (keys.has(k)) return false
          keys.add(k)
          return true
        })
      }
    }
    days.push({ date, slots })
  })

  if (errors.length > 0) return { ok: false, errors }
  days.sort((a, b) => a.date.localeCompare(b.date))
  return { ok: true, menu: { weekStart, days } }
}

export interface NameKeyed {
  id: string
  searchKeys: string[]
}

/** normalized name/alias → food id. */
export function buildNameLookup(items: readonly NameKeyed[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of items) for (const k of item.searchKeys) if (!map.has(normalizeName(k))) map.set(normalizeName(k), item.id)
  return map
}

export interface UnmatchedName {
  /** First spelling seen in the menu. */
  name: string
  key: string
  slots: MealSlot[]
  count: number
}

export interface MenuMatch {
  matchedCount: number
  totalCount: number
  unmatched: UnmatchedName[]
}

export function matchMenu(menu: ParsedMenu, lookup: ReadonlyMap<string, string>): MenuMatch {
  let matchedCount = 0
  let totalCount = 0
  const unmatched = new Map<string, UnmatchedName>()
  for (const day of menu.days) {
    for (const slot of MEAL_SLOTS) {
      for (const name of day.slots[slot]) {
        totalCount++
        const key = normalizeName(name)
        if (lookup.has(key)) {
          matchedCount++
          continue
        }
        const u = unmatched.get(key) ?? { name, key, slots: [], count: 0 }
        u.count++
        if (!u.slots.includes(slot)) u.slots.push(slot)
        unmatched.set(key, u)
      }
    }
  }
  return { matchedCount, totalCount, unmatched: [...unmatched.values()].sort((a, b) => a.name.localeCompare(b.name)) }
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]!
}

const tokenize = (s: string) => normalizeName(s).split(/[^a-z0-9]+/).filter(Boolean)

/** A one-typo word match counts for less than an exact one, so 'salan' ≈ 'salad' alone isn't enough. */
const FUZZY_WORD_WEIGHT = 0.75

/** 1 for the same word, FUZZY_WORD_WEIGHT for one typo apart (both 4+ letters), else 0. */
function wordMatch(a: string, b: string): number {
  if (a === b) return 1
  return Math.min(a.length, b.length) >= 4 && levenshtein(a, b) <= 1 ? FUZZY_WORD_WEIGHT : 0
}

/** Dice similarity over matched words (order-insensitive), 0–1. */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.length === 0 || tb.length === 0) return 0
  const used = new Set<number>()
  let matched = 0
  for (const t of ta) {
    // Prefer an exact partner, then a fuzzy one.
    let best = -1
    let bestScore = 0
    tb.forEach((u, idx) => {
      if (used.has(idx)) return
      const w = wordMatch(t, u)
      if (w > bestScore) {
        best = idx
        bestScore = w
      }
    })
    if (best >= 0) {
      used.add(best)
      matched += bestScore
    }
  }
  return (2 * matched) / (ta.length + tb.length)
}

export interface Suggestion {
  id: string
  score: number
}

/** Closest existing dishes for an unmatched menu name. */
export function suggestDishes(name: string, items: readonly NameKeyed[], limit = 3, minScore = 0.5): Suggestion[] {
  const out: Suggestion[] = []
  for (const item of items) {
    const score = Math.max(0, ...item.searchKeys.map((k) => nameSimilarity(name, k)))
    if (score >= minScore) out.push({ id: item.id, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** 'Paneer Butter Masala' → 'paneer-butter-masala', suffixed if taken. */
export function slugify(name: string, taken: ReadonlySet<string>): string {
  const base = tokenize(name).join('-') || 'dish'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
