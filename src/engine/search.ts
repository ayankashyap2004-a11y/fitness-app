export interface Searchable {
  name: string
  /** Lowercased name + aliases. */
  searchKeys: string[]
  timesOnMenu?: number
}

/** 0 exact, 1 prefix, 2 word prefix, 3 substring; null if a token doesn't match. */
function scoreKey(key: string, query: string, tokens: string[]): number | null {
  if (!tokens.every((t) => key.includes(t))) return null
  if (key === query) return 0
  if (key.startsWith(query)) return 1
  const words = key.split(/[\s&/-]+/)
  if (tokens.every((t) => words.some((w) => w.startsWith(t)))) return 2
  return 3
}

/**
 * Case-insensitive match on name and aliases. Every query word must appear in the same key.
 * Ties break on how often the dish appears on the mess menu, then by name.
 */
export function searchFoods<T extends Searchable>(items: readonly T[], query: string, limit = 30): T[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!q) return []
  const tokens = q.split(' ')

  const scored: { item: T; score: number }[] = []
  for (const item of items) {
    let best: number | null = null
    for (const key of item.searchKeys) {
      const s = scoreKey(key, q, tokens)
      if (s !== null && (best === null || s < best)) best = s
    }
    if (best !== null) scored.push({ item, score: best })
  }

  scored.sort(
    (a, b) =>
      a.score - b.score ||
      (b.item.timesOnMenu ?? 0) - (a.item.timesOnMenu ?? 0) ||
      a.item.name.localeCompare(b.item.name),
  )
  return scored.slice(0, limit).map((s) => s.item)
}
