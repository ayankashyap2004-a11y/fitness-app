import { useLiveQuery } from 'dexie-react-hooks'
import { markReminderNotified } from '../../db/photos'
import type { FitnessDB } from '../../db/schema'
import { db } from '../../db/schema'
import { photoReminderDue } from '../../engine/photos'

async function isDue(database: FitnessDB, today: string): Promise<boolean> {
  const [meta, last] = await Promise.all([database.appMeta.get(1), database.progressPhotos.orderBy('date').last()])
  return photoReminderDue(!!meta?.photoReminder, last?.date, today)
}

/** For the Today banner. */
export function usePhotoReminderDue(today: string): boolean | undefined {
  return useLiveQuery(() => isDue(db, today), [today])
}

/**
 * On app open: if a reminder is due, notifications are allowed, and none was shown today,
 * show one. A free app with no server can't schedule notifications while closed, so this
 * only runs when the app is opened. Android Chrome needs the service worker to show it.
 */
export async function notifyPhotoReminderIfDue(database: FitnessDB, today: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!(await isDue(database, today))) return
  const meta = await database.appMeta.get(1)
  if (meta?.photoReminderNotifiedOn === today) return
  const reg = await navigator.serviceWorker?.getRegistration()
  if (!reg) return
  await reg.showNotification('Progress photo day', {
    body: "It's been a week since your last progress photos. Front, side and back, same light as before.",
    icon: './pwa-192x192.png',
    tag: 'photo-reminder',
  })
  await markReminderNotified(database, today)
}
