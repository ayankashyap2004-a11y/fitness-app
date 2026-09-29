import { useLiveQuery } from 'dexie-react-hooks'
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder'
import { db } from '../../db/schema'

export function SettingsScreen() {
  const meta = useLiveQuery(() => db.appMeta.get(1))

  const storageLabel =
    meta === undefined ? '…' : meta.persistGranted ? 'Persistent' : 'Best-effort (may be cleared by the browser)'

  return (
    <ScreenPlaceholder title="Settings" phase="Phase 2 (profile) and Phase 9 (backup)">
      <dl className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <dt>Storage</dt>
        <dd className={meta?.persistGranted ? 'text-accent' : 'text-ink'}>{storageLabel}</dd>
      </dl>
    </ScreenPlaceholder>
  )
}
