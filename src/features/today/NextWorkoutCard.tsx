import { Button } from '../../components/Button'
import { useNav } from '../../components/nav'
import { useActiveSession, useAppMeta, useTemplates } from '../../db/hooks'
import { MODE_LABELS } from '../workout/labels'

/** Today's workout card (PRD §5): the next day in the rotation, or the session in progress. */
export function NextWorkoutCard() {
  const go = useNav()
  const session = useActiveSession()
  const templates = useTemplates()
  const meta = useAppMeta()
  if (session === undefined || !templates || !meta || templates.length === 0) return null

  const next = templates.find((t) => t.dayIndex === meta.splitPointer % templates.length) ?? templates[0]!
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4">
      <div className="min-w-0">
        <p className="text-sm text-muted">{session ? 'Workout in progress' : 'Next workout'}</p>
        <p className="truncate text-lg font-semibold">
          {session ? `${session.dayName} · ${MODE_LABELS[session.mode]}` : `Day ${next.dayIndex + 1}: ${next.name}`}
        </p>
        {!session && <p className="truncate text-sm text-muted">{next.focus}</p>}
      </div>
      <Button className="shrink-0" onClick={() => go('workout')}>
        {session ? 'Resume' : 'Start'}
      </Button>
    </div>
  )
}
