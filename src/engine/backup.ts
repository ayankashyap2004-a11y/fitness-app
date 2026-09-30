// Backup format (PRD §4.9): a .zip with data.json (every table) and photos/<id>.jpg.

export const BACKUP_FORMAT = 'fitness-app-backup'
export const BACKUP_FORMAT_VERSION = 1
/** Remind after this many days without an export. */
export const BACKUP_REMINDER_DAYS = 14

export interface BackupManifest {
  format: typeof BACKUP_FORMAT
  formatVersion: number
  /** Dexie schema version of the app that made the backup. */
  dbVersion: number
  exportedAt: string
  /** Rows per table, for the preview before restoring. */
  counts: Record<string, number>
}

export function backupFileName(today: string): string {
  return `fitness-backup-${today}.zip`
}

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!) / 86_400_000
}

/** Due when 14+ days have passed since the last export, or since first launch if never exported. */
export function backupDue(lastBackupDate: string | undefined, firstLaunchAt: string | undefined, today: string, days = BACKUP_REMINDER_DAYS): boolean {
  const since = lastBackupDate ?? firstLaunchAt
  if (!since) return false
  return dayNumber(today) - dayNumber(since) >= days
}

export type ManifestCheck = { ok: true; manifest: BackupManifest } | { ok: false; error: string }

export function checkManifest(value: unknown, appDbVersion: number): ManifestCheck {
  if (typeof value !== 'object' || value === null) return { ok: false, error: "This isn't a backup from this app." }
  const m = value as Partial<BackupManifest>
  if (m.format !== BACKUP_FORMAT) return { ok: false, error: "This isn't a backup from this app." }
  if (typeof m.formatVersion !== 'number' || m.formatVersion > BACKUP_FORMAT_VERSION)
    return { ok: false, error: 'This backup was made by a newer version of the app. Update the app first.' }
  if (typeof m.dbVersion !== 'number' || m.dbVersion > appDbVersion)
    return { ok: false, error: 'This backup was made by a newer version of the app. Update the app first.' }
  if (typeof m.exportedAt !== 'string' || typeof m.counts !== 'object' || m.counts === null)
    return { ok: false, error: 'This backup is incomplete or damaged.' }
  return { ok: true, manifest: m as BackupManifest }
}

/** Human summary for the restore preview, most meaningful tables first. */
export function describeCounts(counts: Record<string, number>): string[] {
  const labels: [string, string, string][] = [
    ['foodLog', 'food entry', 'food entries'],
    ['weightLogs', 'weigh-in', 'weigh-ins'],
    ['workoutSessions', 'workout', 'workouts'],
    ['setLogs', 'set', 'sets'],
    ['cardioLogs', 'cardio session', 'cardio sessions'],
    ['progressPhotos', 'photo', 'photos'],
  ]
  return labels
    .filter(([k]) => (counts[k] ?? 0) > 0)
    .map(([k, one, many]) => `${counts[k]} ${counts[k] === 1 ? one : many}`)
}
