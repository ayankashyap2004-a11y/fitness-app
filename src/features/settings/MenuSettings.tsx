import { useState } from 'react'
import { useMenuRange } from '../../db/hooks'
import { ImportMenuSheet } from '../menu/ImportMenuSheet'

export function MenuSettings({ today }: { today: string }) {
  const range = useMenuRange()
  const [importing, setImporting] = useState(false)
  if (range === undefined) return null

  const status = !range
    ? "Optional. If you import the week's menu, its dishes show first on the Food screen."
    : range.last < today
      ? `Last imported menu ended ${fmt(range.last)}.`
      : `Loaded: ${fmt(range.first)} – ${fmt(range.last)}`

  return (
    <div className="rounded-2xl border border-line bg-card">
      <div className="px-4 pt-3 pb-2">
        <h2 className="font-medium">Mess menu import</h2>
        <p className="text-sm text-muted">{status}</p>
      </div>
      <button
        type="button"
        onClick={() => setImporting(true)}
        className="min-h-12 w-full border-t border-line text-base text-accent active:bg-line/50"
      >
        Import menu
      </button>
      {importing && <ImportMenuSheet onClose={() => setImporting(false)} />}
    </div>
  )
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
