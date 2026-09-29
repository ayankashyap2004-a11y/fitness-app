import { normalizeName, searchKeysFor } from '../engine/food'
import { offDisplayName, offLegacySearchUrl, offSearchUrl, offServing, parseOffSearch, type OffProduct } from '../engine/off'
import type { FitnessDB } from './schema'
import type { FoodItem } from './types'

/** Returns parsed JSON; throws on network or HTTP errors. Injected so tests never hit the network. */
export type Fetcher = (url: string) => Promise<unknown>

const TIMEOUT_MS = 12_000

export const fetchJson: Fetcher = async (url) => {
  // Browsers don't allow setting User-Agent, so OFF sees the browser's own.
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Open Food Facts returned ${res.status}`)
  return res.json()
}

export type OffErrorKind = 'offline' | 'failed'

export class OffError extends Error {
  constructor(readonly kind: OffErrorKind) {
    super(
      kind === 'offline'
        ? "You're offline and this search isn't saved yet. Add it as a new dish below, or search again when you're online."
        : // Campus and office firewalls often block openfoodfacts.org, and a blocked request looks
          // the same as a network error to the browser.
          "Couldn't reach Open Food Facts. Some Wi-Fi networks (like campus Wi-Fi) block it, so try mobile data, or add it as a new dish below.",
    )
  }
}

export interface OffSearchResult {
  products: OffProduct[]
  fromCache: boolean
  fetchedAt: string
}

/**
 * Searches Open Food Facts (primary API, then the legacy one), caching every result by
 * query. Offline or on failure, a cached copy of the same search is used if there is one.
 */
export async function searchOff(
  db: FitnessDB,
  query: string,
  fetcher: Fetcher = fetchJson,
  online: boolean = globalThis.navigator?.onLine ?? true,
  now = new Date(),
): Promise<OffSearchResult> {
  const key = normalizeName(query)
  if (!key) return { products: [], fromCache: false, fetchedAt: now.toISOString() }
  const cached = await db.offSearches.get(key)
  const fromCache = (kind: OffErrorKind): OffSearchResult => {
    if (cached) return { products: cached.products, fromCache: true, fetchedAt: cached.fetchedAt }
    throw new OffError(kind)
  }

  if (!online) return fromCache('offline')

  let products: OffProduct[] | null = null
  for (const url of [offSearchUrl(key), offLegacySearchUrl(key)]) {
    try {
      const found = parseOffSearch(await fetcher(url))
      products = found
      if (found.length > 0) break
    } catch {
      // try the next endpoint
    }
  }
  if (products === null) return fromCache('failed')

  const fetchedAt = now.toISOString()
  await db.offSearches.put({ query: key, fetchedAt, products })
  return { products, fromCache: false, fetchedAt }
}

export const offFoodId = (barcode: string) => `off-${barcode}`

/** Adds (or refreshes) a picked product in the library so it's searchable and loggable offline. */
export async function saveOffProduct(db: FitnessDB, p: OffProduct, now = new Date()): Promise<string> {
  const id = offFoodId(p.barcode)
  const name = offDisplayName(p)
  const serving = offServing(p)
  await db.transaction('rw', db.foodItems, async () => {
    const old = await db.foodItems.get(id)
    const item: FoodItem = {
      id,
      name,
      aliases: p.name !== name ? [p.name] : [],
      searchKeys: searchKeysFor(name, p.name !== name ? [p.name] : []),
      source: 'off',
      offBarcode: p.barcode,
      perPortion: serving.perPortion,
      defaultUnit: serving.defaultUnit,
      servingUnits: serving.servingUnits,
      updatedAt: now.toISOString(),
      // Keep what the user owns.
      userOverride: old?.userOverride,
      lastQty: old?.lastQty,
      lastUnit: old?.lastUnit,
    }
    await db.foodItems.put(item)
  })
  return id
}
