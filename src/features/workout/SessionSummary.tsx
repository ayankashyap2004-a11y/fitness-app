import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '../../components/Button'
import { db } from '../../db/schema'
import { formatClock, summarize } from '../../engine/workout'
import { MODE_LABELS } from './labels'

export function SessionSummary({ sessionId, onDone }: { sessionId: number; onDone: () => void }) {
  const data = useLiveQuery(async () => {
    const session = await db.workoutSessions.get(sessionId)
    const sets = await db.setLogs.where('sessionId').equals(sessionId).toArray()
    return session ? { session, sets } : null
  }, [sessionId])
  if (!data) return null

  const { session, sets } = data
  const s = summarize(sets, session.startedAt, session.endedAt ?? session.startedAt)
  return (
    <section className="space-y-4 px-4 pt-6">
      <div>
        <p className="text-sm text-muted">Workout done</p>
        <h1 className="text-2xl font-semibold">
          {session.dayName} · {MODE_LABELS[session.mode]}
        </h1>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="sets" value={String(s.totalSets)} />
        <Stat label="volume" value={`${s.volumeKg.toLocaleString('en-IN')} kg`} />
        <Stat label="duration" value={formatClock(s.durationSec)} />
      </dl>
      <p className="text-sm text-muted">Volume is weight × reps; bodyweight sets count as 0.</p>
      <Button className="w-full" onClick={onDone}>
        Done
      </Button>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card py-3">
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  )
}
