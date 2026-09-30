import type { FitnessDB } from './schema'
import type { PhotoAngle } from './types'

/**
 * Stores a progress photo in the app's own database (not the phone gallery). One photo per
 * angle per day: taking another replaces it.
 */
export async function savePhoto(db: FitnessDB, date: string, angle: PhotoAngle, blob: Blob): Promise<number> {
  return db.transaction('rw', db.progressPhotos, async () => {
    const existing = await db.progressPhotos.where({ date, angle }).first()
    if (existing?.id !== undefined) {
      await db.progressPhotos.put({ id: existing.id, date, angle, blob })
      return existing.id
    }
    return (await db.progressPhotos.add({ date, angle, blob })) as number
  })
}

export async function deletePhoto(db: FitnessDB, id: number) {
  await db.progressPhotos.delete(id)
}

export async function setPhotoReminder(db: FitnessDB, on: boolean) {
  await db.appMeta.update(1, { photoReminder: on })
}

export async function markReminderNotified(db: FitnessDB, date: string) {
  await db.appMeta.update(1, { photoReminderNotifiedOn: date })
}
