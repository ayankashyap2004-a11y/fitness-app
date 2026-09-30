import { skipDeload, unskipDeload } from '../../db/deload'
import { db } from '../../db/schema'
import { DELOAD_EVERY_WEEKS, type DeloadStatus } from '../../engine/deload'

/** Explains a due or running deload, with Skip (pushes it back a week). */
export function DeloadBanner({ status, today }: { status: DeloadStatus; today: string }) {
  if (status.state === 'normal') return null

  if (status.state === 'skipped') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-card px-4 py-2 text-sm">
        <span className="text-muted">Deload skipped this week · {status.trainingWeeks} training weeks since the last one</span>
        <button type="button" onClick={() => unskipDeload(db)} className="min-h-11 shrink-0 px-2 text-accent">
          Undo
        </button>
      </div>
    )
  }

  const overdue = status.trainingWeeks > DELOAD_EVERY_WEEKS
  return (
    <div className="space-y-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
      <p className="font-semibold text-amber-200">{status.state === 'active' ? 'Deload week in progress' : 'Deload week'}</p>
      <p>
        {status.trainingWeeks} training weeks since your last deload
        {overdue ? ` (planned every ${DELOAD_EVERY_WEEKS})` : ''}. This week, do the same exercises at half the sets to let
        fatigue clear. Log as normal.
      </p>
      {status.state === 'due' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted">Every 6 weeks is a practical default, not a hard rule.</span>
          <button type="button" onClick={() => skipDeload(db, today)} className="min-h-11 shrink-0 rounded-lg px-3 text-accent active:bg-line">
            Skip this week
          </button>
        </div>
      )}
    </div>
  )
}
