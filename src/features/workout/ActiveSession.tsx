import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { useExercises, useLastTime, useSessionSets, useToday } from '../../db/hooks'
import { db } from '../../db/schema'
import type { SetLog, WorkoutSession } from '../../db/types'
import { discardSession, finishSession } from '../../db/workout'
import { formatClock, restAfter, type PlannedExercise } from '../../engine/workout'
import { CardioSheet } from './CardioSheet'
import { ExerciseCard } from './ExerciseCard'
import { MODE_LABELS } from './labels'
import { RestBar } from './RestBar'
import { useRestTimer } from './useRestTimer'

interface Props {
  session: WorkoutSession
  onFinished: (sessionId: number) => void
}

export function ActiveSession({ session, onFinished }: Props) {
  const sessionId = session.id!
  const exercises = useExercises()
  const sets = useSessionSets(sessionId)
  const last = useLastTime(
    session.plan.map((p) => p.exerciseId),
    sessionId,
  )
  const timer = useRestTimer()
  const [now, setNow] = useState(() => Date.now())
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [loggingCardio, setLoggingCardio] = useState(false)
  const today = useToday()

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!exercises || !sets || !last) return null

  const elapsed = Math.round((now - Date.parse(session.startedAt)) / 1000)
  const planned = session.plan.reduce((n, p) => n + p.sets, 0)
  const setsFor = (key: string) => sets.filter((s) => s.planKey === key)

  const finish = async () => {
    timer.skip()
    await finishSession(db, sessionId)
    onFinished(sessionId)
  }

  // Group consecutive superset entries so they render together.
  const groups: { superset?: string; items: { p: PlannedExercise; index: number }[] }[] = []
  session.plan.forEach((p, index) => {
    const prev = groups[groups.length - 1]
    if (p.superset && prev?.superset === p.superset) prev.items.push({ p, index })
    else groups.push({ superset: p.superset, items: [{ p, index }] })
  })

  const card = ({ p, index }: { p: PlannedExercise; index: number }) => {
    const ex = exercises.get(p.exerciseId)
    if (!ex) return null
    return (
      <ExerciseCard
        key={p.key}
        sessionId={sessionId}
        planned={p}
        exercise={ex}
        sets={setsFor(p.key)}
        last={(last.get(p.exerciseId) ?? []) as SetLog[]}
        note={session.notes?.[p.key]}
        restSec={restAfter(session.plan, index) ? p.restSec : 0}
        onLogged={(sec) => (sec > 0 ? timer.start(sec) : timer.skip())}
      />
    )
  }

  return (
    <section className={`space-y-3 px-4 pt-4 ${timer.remaining !== null ? 'pb-16' : ''}`}>
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            {session.dayName} · {MODE_LABELS[session.mode]}
            {session.isDeload && <span className="ml-2 rounded-md bg-amber-400/15 px-1.5 py-0.5 align-middle text-xs font-medium text-amber-300">Deload · half sets</span>}
          </h1>
          <p className="text-sm text-muted tabular-nums">
            {formatClock(elapsed)} · {sets.length} of {planned} sets
          </p>
        </div>
        <Button onClick={finish} className="shrink-0">
          Finish
        </Button>
      </header>

      {groups.map((g) =>
        g.superset ? (
          <div key={g.superset} className="space-y-2 rounded-2xl border border-dashed border-accent/50 p-2">
            <p className="px-1 text-xs font-medium uppercase tracking-wide text-accent">Superset: alternate, rest after both</p>
            {g.items.map(card)}
          </div>
        ) : (
          card(g.items[0]!)
        ),
      )}

      <button
        type="button"
        onClick={() => setLoggingCardio(true)}
        className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-dashed border-line px-4 text-left text-accent"
      >
        <span className="text-xl leading-none">+</span> Log cardio (e.g. treadmill warm-up or finisher)
      </button>

      <div className="pt-2 pb-4">
        {confirmDiscard ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-400/40 bg-red-400/10 p-3 text-sm">
            <span className="flex-1">Discard this session and its sets?</span>
            <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>
              Keep
            </Button>
            <Button
              variant="secondary"
              className="text-red-300"
              onClick={async () => {
                timer.skip()
                await discardSession(db, sessionId)
              }}
            >
              Discard
            </Button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDiscard(true)} className="min-h-11 w-full text-sm text-muted">
            Discard session
          </button>
        )}
      </div>

      <RestBar timer={timer} />
      {loggingCardio && <CardioSheet today={today} onClose={() => setLoggingCardio(false)} />}
    </section>
  )
}
