import { useNav } from '../../components/nav'
import { usePhotoReminderDue } from '../progress/photoReminder'

export function PhotoReminderBanner({ today }: { today: string }) {
  const due = usePhotoReminderDue(today)
  const go = useNav()
  if (!due) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3">
      <p className="text-sm">Progress photo day: front, side and back.</p>
      <button type="button" onClick={() => go('progress')} className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-accent active:bg-line">
        Take photos
      </button>
    </div>
  )
}
