import { useEffect, useState } from 'react'
import { useAppMeta, useToday } from '../../db/hooks'
import { setPhotoReminder } from '../../db/photos'
import { db } from '../../db/schema'
import { isNative } from '../../platform'
import { notificationPermission, requestNotificationPermission, syncPhotoReminder, type NotifyPermission } from '../progress/photoReminder'

export function PhotoReminderSettings() {
  const meta = useAppMeta()
  const today = useToday()
  const [permission, setPermission] = useState<NotifyPermission>('prompt')

  useEffect(() => {
    void notificationPermission().then(setPermission)
  }, [])

  if (!meta) return null
  const on = !!meta.photoReminder

  const toggle = async () => {
    const next = !on
    await setPhotoReminder(db, next)
    if (next && permission === 'prompt') setPermission(await requestNotificationPermission())
    await syncPhotoReminder(db, today)
  }

  const note = !on
    ? 'Off'
    : permission === 'granted'
      ? isNative
        ? 'Banner on Today, plus a notification at 9:00 on photo day, even when the app is closed.'
        : 'Banner on Today, plus a notification when you open the app on photo day.'
      : permission === 'denied'
        ? 'Banner on Today. Notifications are blocked for this app in your phone settings.'
        : 'Banner on Today.'

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
      <div className="min-w-0">
        <h2 className="font-medium">Weekly photo reminder</h2>
        <p className="text-sm text-muted">{note}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Weekly photo reminder"
        onClick={toggle}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line'}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${on ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}
