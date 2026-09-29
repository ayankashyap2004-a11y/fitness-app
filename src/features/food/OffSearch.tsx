import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { OffError, saveOffProduct, searchOff, type OffSearchResult } from '../../db/off'
import { db } from '../../db/schema'
import { formatQty, normalizeName, splitUnit } from '../../engine/food'
import { offDisplayName, offServing, type OffProduct } from '../../engine/off'

interface Props {
  query: string
  /** Called with the library id after the picked product is saved. */
  onReady: (foodId: string) => void
}

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; result: OffSearchResult } | { kind: 'error'; message: string }

/**
 * Packaged-food search on Open Food Facts. Runs only when tapped (the API allows ~10
 * searches a minute); a search done before shows straight away from the cache.
 */
export function OffSearch({ query, onReady }: Props) {
  const key = normalizeName(query)
  const cached = useLiveQuery(() => db.offSearches.get(key), [key])
  const [state, setState] = useState<State>({ kind: 'idle' })

  const run = async () => {
    setState({ kind: 'loading' })
    try {
      setState({ kind: 'done', result: await searchOff(db, query) })
    } catch (e) {
      setState({ kind: 'error', message: e instanceof OffError ? e.message : 'Something went wrong. Try again.' })
    }
  }

  const pick = async (p: OffProduct) => onReady(await saveOffProduct(db, p))

  const shown: OffSearchResult | undefined =
    state.kind === 'done' ? state.result : cached ? { products: cached.products, fromCache: true, fetchedAt: cached.fetchedAt } : undefined

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium text-muted">Packaged foods</h2>
        <span className="text-xs text-muted">Open Food Facts</span>
      </div>

      {shown ? (
        <>
          {shown.products.length > 0 ? (
            <ul className="-mx-1 rounded-2xl border border-line bg-card p-1">
              {shown.products.map((p) => (
                <OffRow key={p.barcode} p={p} onClick={() => pick(p)} />
              ))}
            </ul>
          ) : (
            <p className="px-1 text-sm text-muted">No packaged foods found for "{query.trim()}".</p>
          )}
          <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted">
            <span>{shown.fromCache ? `Saved search from ${new Date(shown.fetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Just searched'}</span>
            {shown.fromCache && state.kind !== 'loading' && (
              <button type="button" onClick={run} className="min-h-11 px-2 text-accent">
                Search again
              </button>
            )}
          </div>
        </>
      ) : state.kind === 'loading' ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-3 text-sm text-muted" role="status">
          Searching Open Food Facts…
        </p>
      ) : (
        <button
          type="button"
          onClick={run}
          className="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-line bg-card px-4 text-left active:bg-line/50"
        >
          <span className="min-w-0 truncate">Search packaged foods for "{query.trim()}"</span>
          <span className="shrink-0 text-sm text-accent">Search</span>
        </button>
      )}

      {state.kind === 'loading' && shown && (
        <p className="px-1 text-xs text-muted" role="status">
          Searching Open Food Facts…
        </p>
      )}
      {state.kind === 'error' && (
        <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200" role="alert">
          {state.message}
        </p>
      )}
    </div>
  )
}

function OffRow({ p, onClick }: { p: OffProduct; onClick: () => void }) {
  const s = offServing(p)
  const unit = splitUnit(s.defaultUnit)
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left active:bg-line"
      >
        <span className="min-w-0">
          <span className="block truncate">{offDisplayName(p)}</span>
          <span className="block truncate text-sm text-muted">
            {formatQty(1, unit.label)}
            {unit.detail ? ` (${unit.detail})` : ''}
            {p.quantity ? ` · pack ${p.quantity}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-right text-sm tabular-nums">
          <span className="block">{s.perPortion.kcal} kcal</span>
          <span className="block text-protein">{s.perPortion.protein} g P</span>
        </span>
      </button>
    </li>
  )
}
