import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION, backupFileName, checkManifest, type BackupManifest } from '../engine/backup'
import { toISODate } from '../engine/dates'
import type { FitnessDB } from './schema'
import { seedLibrary } from './seed'
import type { AppMeta } from './types'

const DATA_FILE = 'data.json'
const PHOTO_TABLE = 'progressPhotos'

interface StoredPhotoRow {
  id: number
  date: string
  angle: string
  /** Path inside the zip. */
  file: string
  type: string
}

interface BackupData {
  manifest: BackupManifest
  tables: Record<string, unknown[]>
}

export interface ExportResult {
  bytes: Uint8Array
  fileName: string
  manifest: BackupManifest
}

/** Every table as JSON, photos as separate JPEG files. Marks today as the last backup. */
export async function exportBackup(db: FitnessDB, now = new Date()): Promise<ExportResult> {
  const tables: Record<string, unknown[]> = {}
  const files: Zippable = {}

  // Read everything in one consistent snapshot. Blob reading happens after the transaction:
  // awaiting non-IndexedDB work inside it can make browsers commit it early.
  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) tables[table.name] = await table.toArray()
  })
  const rawPhotos = (tables[PHOTO_TABLE] ?? []) as { id: number; date: string; angle: string; blob: Blob }[]
  tables[PHOTO_TABLE] = await Promise.all(
    rawPhotos.map(async (p): Promise<StoredPhotoRow> => {
      const file = `photos/${p.id}.jpg`
      // Already-compressed JPEGs: store without recompressing.
      files[file] = [new Uint8Array(await p.blob.arrayBuffer()), { level: 0 }]
      return { id: p.id, date: p.date, angle: p.angle, file, type: p.blob.type || 'image/jpeg' }
    }),
  )

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    dbVersion: db.verno,
    exportedAt: now.toISOString(),
    counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
  }
  files[DATA_FILE] = strToU8(JSON.stringify({ manifest, tables } satisfies BackupData))
  const bytes = zipSync(files)

  await db.appMeta.update(1, { lastBackupDate: toISODate(now) })
  return { bytes, fileName: backupFileName(toISODate(now)), manifest }
}

export interface ParsedBackup {
  manifest: BackupManifest
  tables: Record<string, unknown[]>
  photos: Map<string, Uint8Array>
}

export type ReadResult = { ok: true; backup: ParsedBackup } | { ok: false; error: string }

/** Unzips and checks a backup without touching the database. */
export function readBackup(bytes: Uint8Array, appDbVersion: number): ReadResult {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    return { ok: false, error: "That file isn't a valid .zip backup." }
  }
  const raw = files[DATA_FILE]
  if (!raw) return { ok: false, error: "This isn't a backup from this app." }
  let data: Partial<BackupData>
  try {
    data = JSON.parse(strFromU8(raw)) as Partial<BackupData>
  } catch {
    return { ok: false, error: 'This backup is incomplete or damaged.' }
  }
  const check = checkManifest(data.manifest, appDbVersion)
  if (!check.ok) return check
  if (typeof data.tables !== 'object' || data.tables === null) return { ok: false, error: 'This backup is incomplete or damaged.' }

  const photos = new Map<string, Uint8Array>()
  for (const row of (data.tables[PHOTO_TABLE] ?? []) as StoredPhotoRow[]) {
    const f = files[row.file]
    if (!f) return { ok: false, error: `This backup is missing a photo (${row.file}).` }
    photos.set(row.file, f)
  }
  return { ok: true, backup: { manifest: check.manifest, tables: data.tables, photos } }
}

/**
 * Replaces everything on this device with the backup, in one transaction: either all of it
 * is restored or nothing changes. Device-specific storage settings are kept.
 */
export async function restoreBackup(db: FitnessDB, backup: ParsedBackup) {
  await db.transaction('rw', db.tables, async () => {
    const deviceMeta = await db.appMeta.get(1)
    for (const table of db.tables) {
      await table.clear()
      let rows = backup.tables[table.name] ?? []
      if (table.name === PHOTO_TABLE) {
        rows = (rows as StoredPhotoRow[]).map((r) => ({
          id: r.id,
          date: r.date,
          angle: r.angle,
          blob: new Blob([backup.photos.get(r.file)! as BlobPart], { type: r.type }),
        }))
      }
      if (table.name === 'appMeta') {
        rows = (rows as AppMeta[]).map((m) => ({
          ...m,
          persistRequested: deviceMeta?.persistRequested ?? m.persistRequested,
          persistGranted: deviceMeta?.persistGranted,
          lastBackupDate: backup.manifest.exportedAt.slice(0, 10),
        }))
      }
      if (rows.length > 0) await table.bulkAdd(rows as never[])
    }
  })
  // A backup from an older app version may predate newer seed data.
  await seedLibrary(db)
}
