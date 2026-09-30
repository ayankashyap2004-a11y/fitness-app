import { LocalNotifications } from '@capacitor/local-notifications'
import { useLiveQuery } from 'dexie-react-hooks'
import { markReminderNotified } from '../../db/photos'
import type { FitnessDB } from '../../db/schema'
import { db } from '../../db/schema'
import { toISODate } from '../../engine/dates'
import { nextReminderAt, photoReminderDue } from '../../engine/photos'
import { isNative } from '../../platform'

const TITLE = 'Progress photo day'
const BODY = "It's been a week since your last progress photos. Front, side and back, same light as before."
/** Fixed id so rescheduling replaces the previous reminder. */
const REMINDER_ID = 7001

async function isDue(database: FitnessDB, today: string): Promise<boolean> {
  const [meta, last] = await Promise.all([database.appMeta.get(1), database.progressPhotos.orderBy('date').last()])
  return photoReminderDue(!!meta?.photoReminder, last?.date, today)
}

/** For the Today banner. */
export function usePhotoReminderDue(today: string): boolean | undefined {
  return useLiveQuery(() => isDue(db, today), [today])
}

/**
 * Web: if a reminder is due, notifications are allowed and none was shown today, show one
 * now. Without a server a web app can't schedule notifications while closed, so this only
 * runs when the app is opened. Android Chrome needs the service worker to show it.
 */
async function notifyWebIfDue(database: FitnessDB, today: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!(await isDue(database, today))) return
  const meta = await database.appMeta.get(1)
  if (meta?.photoReminderNotifiedOn === today) return
  const reg = await navigator.serviceWorker?.getRegistration()
  if (!reg) return
  await reg.showNotification(TITLE, { body: BODY, icon: './pwa-192x192.png', tag: 'photo-reminder' })
  await markReminderNotified(database, today)
}

/** APK: schedule the next reminder as a real local notification, so it fires even when closed. */
async function scheduleNative(database: FitnessDB) {
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
  const [meta, last] = await Promise.all([database.appMeta.get(1), database.progressPhotos.orderBy('date').last()])
  if (!meta?.photoReminder) return
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return
  const next = nextReminderAt(true, last?.date, new Date(), meta.photoReminderNotifiedOn)
  if (!next) return
  await LocalNotifications.schedule({ notifications: [{ id: REMINDER_ID, title: TITLE, body: BODY, schedule: { at: next.at } }] })
  if (next.immediate) await markReminderNotified(database, toISODate(new Date()))
}

/** Call on app start, when the setting changes, and after adding or deleting a photo. */
export async function syncPhotoReminder(database: FitnessDB, today: string) {
  try {
    if (isNative) await scheduleNative(database)
    else await notifyWebIfDue(database, today)
  } catch (err) {
    console.error('Photo reminder failed', err)
  }
}

export type NotifyPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export async function notificationPermission(): Promise<NotifyPermission> {
  if (isNative) {
    const p = (await LocalNotifications.checkPermissions()).display
    return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt'
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission === 'default' ? 'prompt' : Notification.permission
}

export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (isNative) {
    const p = (await LocalNotifications.requestPermissions()).display
    return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt'
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  const p = await Notification.requestPermission()
  return p === 'default' ? 'prompt' : p
}
