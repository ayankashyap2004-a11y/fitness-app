import { useNav } from '../../components/nav'
import { useAppMeta } from '../../db/hooks'
import { backupDue } from '../../engine/backup'

/** PRD §4.9: a banner once 14 days have passed since the last export. */
export function BackupBanner({ today }: { today: string }) {
  const meta = useAppMeta()
  const go = useNav()
  if (!meta || !backupDue(meta.lastBackupDate, meta.firstLaunchAt, today)) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
      <p className="text-sm">
        {meta.lastBackupDate ? "It's been 2+ weeks since your last backup." : "You haven't backed up yet."} Your data lives only on this phone.
      </p>
      <button type="button" onClick={() => go('settings')} className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-accent active:bg-line">
        Back up
      </button>
    </div>
  )
}
