import { useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { exportBackup, readBackup, restoreBackup, type ParsedBackup } from '../../db/backup'
import { useAppMeta } from '../../db/hooks'
import { db } from '../../db/schema'
import { describeCounts } from '../../engine/backup'
import { canShareFiles, downloadBytes, shareBytes } from './saveFile'

const fmt = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

type Status = { kind: 'idle' } | { kind: 'working'; text: string } | { kind: 'done'; text: string } | { kind: 'error'; text: string }

/** Export everything as a .zip (JSON + photos), or restore from one (replaces all data). */
export function BackupSettings() {
  const meta = useAppMeta()
  const file = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pending, setPending] = useState<ParsedBackup | null>(null)
  const share = canShareFiles()

  if (!meta) return null

  const doExport = async (how: 'download' | 'share') => {
    setStatus({ kind: 'working', text: 'Preparing backup…' })
    try {
      const { bytes, fileName } = await exportBackup(db)
      const kb = Math.max(1, Math.round(bytes.length / 1024))
      if (how === 'share' && (await shareBytes(bytes, fileName))) setStatus({ kind: 'done', text: `Shared ${fileName} (${kb} KB).` })
      else {
        downloadBytes(bytes, fileName)
        setStatus({ kind: 'done', text: `Saved ${fileName} (${kb} KB) to Downloads.` })
      }
    } catch {
      setStatus({ kind: 'error', text: 'Backup failed. Please try again.' })
    }
  }

  const onPick = async (f: File | undefined) => {
    if (file.current) file.current.value = ''
    if (!f) return
    const read = readBackup(new Uint8Array(await f.arrayBuffer()), db.verno)
    if (!read.ok) setStatus({ kind: 'error', text: read.error })
    else {
      setStatus({ kind: 'idle' })
      setPending(read.backup)
    }
  }

  const restore = async () => {
    if (!pending) return
    setStatus({ kind: 'working', text: 'Restoring…' })
    try {
      await restoreBackup(db, pending)
      setPending(null)
      // Reload so every screen starts from the restored data.
      location.reload()
    } catch {
      setStatus({ kind: 'error', text: 'Restore failed. Nothing was changed.' })
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <div>
        <h2 className="font-medium">Backup</h2>
        <p className="text-sm text-muted">
          {meta.lastBackupDate ? `Last backup: ${fmt(meta.lastBackupDate)}` : 'Not backed up yet.'} Your data lives only on this phone. Keep a copy somewhere else.
        </p>
      </div>

      <div className={`grid gap-2 ${share ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <Button onClick={() => doExport('download')} disabled={status.kind === 'working'}>
          Export .zip
        </Button>
        {share && (
          <Button variant="secondary" onClick={() => doExport('share')} disabled={status.kind === 'working'}>
            Share…
          </Button>
        )}
      </div>

      <Button variant="secondary" className="w-full" onClick={() => file.current?.click()} disabled={status.kind === 'working'}>
        Restore from backup
      </Button>
      <input ref={file} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />

      {status.kind !== 'idle' && (
        <p
          role={status.kind === 'error' ? 'alert' : 'status'}
          className={`text-sm ${status.kind === 'error' ? 'text-red-300' : status.kind === 'done' ? 'text-accent' : 'text-muted'}`}
        >
          {status.text}
        </p>
      )}

      {pending && (
        <div className="space-y-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm">
          <p className="font-semibold text-amber-200">Replace all data on this phone?</p>
          <p>
            Backup from {fmt(pending.manifest.exportedAt)}: {describeCounts(pending.manifest.counts).join(', ') || 'no entries'}.
          </p>
          <p className="text-muted">Everything currently in the app will be replaced by this backup. This can't be undone.</p>
          <Button variant="secondary" className="w-full" onClick={() => doExport('download')}>
            Export current data first
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={restore}>
              Replace and restore
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
