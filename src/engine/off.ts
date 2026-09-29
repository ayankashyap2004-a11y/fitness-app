// Open Food Facts: the app's only network dependency (CLAUDE.md). Pure parsing and URL
// building live here; fetching and caching are in db/off.ts.
import type { AltUnitLike } from './food'
import type { Macros } from './types'

export interface OffProduct {
  barcode: string
  name: string
  brand?: string
  /** Pack size as printed, e.g. '1 kg'. */
  quantity?: string
  per100g: Macros | null
  perServing: Macros | null
  /** Serving as printed, e.g. '1 scoop (33 g)'. */
  servingLabel?: string
  servingGrams?: number
}

const FIELDS = 'code,product_name,product_name_en,brands,quantity,serving_size,serving_quantity,nutriments'

/** Full-text search (Search-a-licious). Primary. */
export function offSearchUrl(query: string, pageSize = 20): string {
  const q = encodeURIComponent(query.trim())
  return `https://search.openfoodfacts.org/search?q=${q}&page_size=${pageSize}&langs=en&fields=${FIELDS}`
}

/** Legacy full-text search. Fallback when the primary fails or finds nothing. */
export function offLegacySearchUrl(query: string, pageSize = 20): string {
  const q = encodeURIComponent(query.trim())
  return `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=${pageSize}&fields=${FIELDS}`
}

const KJ_PER_KCAL = 4.184

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Reads nutriments for one basis ('100g' or 'serving'). Needs calories; other macros default to 0. */
function macrosFor(n: Record<string, unknown>, basis: '100g' | 'serving'): Macros | null {
  const kcal = num(n[`energy-kcal_${basis}`]) ?? (() => {
    const kj = num(n[`energy-kj_${basis}`]) ?? num(n[`energy_${basis}`])
    return kj === undefined ? undefined : kj / KJ_PER_KCAL
  })()
  if (kcal === undefined) return null
  return {
    kcal: Math.round(kcal),
    protein: round1(num(n[`proteins_${basis}`]) ?? 0),
    carbs: round1(num(n[`carbohydrates_${basis}`]) ?? 0),
    fat: round1(num(n[`fat_${basis}`]) ?? 0),
  }
}

/** Taxonomy tag → display text: 'en:yoga-bar' → 'Yoga Bar'. */
function tagToText(tag: string): string {
  return tag
    .replace(/^[a-z]{2}:/, '')
    .split('-')
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Legacy API: display string 'Amul,Amul Pro'. Search-a-licious: taxonomy tags ['amul', 'amul-pro'].
 */
function firstBrand(v: unknown): string | undefined {
  if (Array.isArray(v)) {
    const tag = typeof v[0] === 'string' ? v[0].trim() : ''
    return tag ? tagToText(tag) : undefined
  }
  const t = typeof v === 'string' ? v.split(',')[0]!.trim() : ''
  return t || undefined
}

function text(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ') : undefined
}

/** Search-a-licious 'text_lang' fields are objects: { main: '…', en: '…', hi: '…' }. Prefer English. */
function langText(v: unknown): string | undefined {
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    const o = v as Record<string, unknown>
    return text(o.en) ?? text(o.main) ?? Object.values(o).map(text).find(Boolean)
  }
  return text(v)
}

/** One product from either search API. Null if it has no name, barcode or calories. */
export function parseOffProduct(raw: unknown): OffProduct | null {
  if (typeof raw !== 'object' || raw === null) return null
  const p = raw as Record<string, unknown>
  const barcode = text(p.code) ?? (typeof p.code === 'number' ? String(p.code) : undefined)
  const name = langText(p.product_name) ?? text(p.product_name_en)
  if (!barcode || !name) return null

  const n = (typeof p.nutriments === 'object' && p.nutriments !== null ? p.nutriments : {}) as Record<string, unknown>
  const per100g = macrosFor(n, '100g')
  const servingGrams = num(p.serving_quantity)
  let perServing = macrosFor(n, 'serving')
  // Derive per serving from per 100 g when only the serving weight is known.
  if (!perServing && per100g && servingGrams) {
    const f = servingGrams / 100
    perServing = { kcal: Math.round(per100g.kcal * f), protein: round1(per100g.protein * f), carbs: round1(per100g.carbs * f), fat: round1(per100g.fat * f) }
  }
  if (!per100g && !perServing) return null

  return {
    barcode,
    name,
    brand: firstBrand(p.brands),
    quantity: langText(p.quantity),
    per100g,
    perServing,
    servingLabel: langText(p.serving_size),
    servingGrams: servingGrams && servingGrams > 0 ? servingGrams : undefined,
  }
}

/** Search-a-licious returns `hits`; the legacy API returns `products`. */
export function parseOffSearch(json: unknown): OffProduct[] {
  if (typeof json !== 'object' || json === null) return []
  const o = json as Record<string, unknown>
  const list = Array.isArray(o.hits) ? o.hits : Array.isArray(o.products) ? o.products : []
  const seen = new Set<string>()
  const out: OffProduct[] = []
  for (const raw of list) {
    const p = parseOffProduct(raw)
    if (p && !seen.has(p.barcode)) {
      seen.add(p.barcode)
      out.push(p)
    }
  }
  return out
}

/** Name shown in the library: brand first unless the name already contains it. */
export function offDisplayName(p: Pick<OffProduct, 'name' | 'brand'>): string {
  if (!p.brand || p.name.toLowerCase().includes(p.brand.toLowerCase())) return p.name
  return `${p.brand} ${p.name}`
}

export interface OffServing {
  defaultUnit: string
  perPortion: Macros
  servingUnits: AltUnitLike[]
}

/**
 * '1 scoop (33 g)' → 'scoop (33 g)'; '30 g' → 'serving (30 g)'; '2 biscuits (25 g)' → 'serving (2 biscuits 25 g)'.
 * Keeps at most one bracket so unit labels split cleanly.
 */
export function servingUnitName(label: string | undefined, grams?: number): string {
  if (!label) return grams ? `serving (${grams} g)` : 'serving'
  const one = /^1\s+([a-z][^()]*?)\s*(?:\(([^()]*)\))?$/i.exec(label)
  if (one) return one[2] ? `${one[1]} (${one[2]})` : one[1]!
  return `serving (${label.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()})`
}

/**
 * Units for logging: by serving when the label gives one (plus 100 g and g if its
 * weight is known), otherwise per 100 g with a gram option.
 */
export function offServing(p: OffProduct): OffServing {
  const g = p.servingGrams
  if (p.perServing) {
    return {
      defaultUnit: servingUnitName(p.servingLabel, g),
      perPortion: p.perServing,
      servingUnits: g ? [{ unit: '100 g', factor: 100 / g }, { unit: 'g', factor: 1 / g }] : [],
    }
  }
  return { defaultUnit: '100 g', perPortion: p.per100g!, servingUnits: [{ unit: 'g', factor: 0.01 }] }
}
