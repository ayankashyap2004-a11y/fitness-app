import { useLiveQuery } from 'dexie-react-hooks'
import { MacroBar } from '../../components/MacroBar'
import { TargetNotes } from '../../components/TargetNotes'
import { useConsumed, useTargets, useToday } from '../../db/hooks'
import { db } from '../../db/schema'
import { NextWorkoutCard } from './NextWorkoutCard'
import { PhotoReminderBanner } from './PhotoReminderBanner'
import { BackupBanner } from './BackupBanner'
import { InstallCard } from '../install/InstallCard'
import { DinnerCard } from './DinnerCard'
import { WeightQuickLog } from './WeightQuickLog'

export function TodayScreen() {
  const today = useToday()
  const state = useTargets(today)
  const consumed = useConsumed(today) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  const todayLog = useLiveQuery(() => db.weightLogs.get(today), [today])

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <section className="space-y-4 px-4 pt-6">
      <header>
        <p className="text-sm text-muted">{dateLabel}</p>
        <h1 className="text-2xl font-semibold">
          {state.status === 'ready' || state.status === 'no-weight' ? `Hi, ${state.profile.name}` : 'Today'}
        </h1>
      </header>

      {state.status === 'ready' && (
        <>
          <div className="space-y-4 rounded-2xl border border-line bg-card p-4">
            <MacroBar label="Protein" consumed={consumed.protein} target={state.targets.protein} unit="g" color="bg-protein" emphasis />
            <MacroBar label="Calories" consumed={consumed.kcal} target={state.targets.kcal} unit="kcal" color="bg-accent" />
            <MacroBar label="Carbs" consumed={consumed.carbs} target={state.targets.carbs} unit="g" color="bg-muted" />
            <MacroBar label="Fat" consumed={consumed.fat} target={state.targets.fat} unit="g" color="bg-muted" />
            <p className="border-t border-line pt-3 text-xs text-muted">
              Based on {state.weight.stale ? 'your last weigh-in' : '7-day average'}{' '}
              <span className="text-ink tabular-nums">{Math.round(state.weight.weightKg * 10) / 10} kg</span>
              {!state.weight.stale && ` (${state.weight.count} weigh-in${state.weight.count === 1 ? '' : 's'})`}
              {state.weight.stale && '. Log today to keep it current.'}
            </p>
          </div>
          <TargetNotes targets={state.targets} />
          <DinnerCard today={today} proteinTarget={state.targets.protein} />
        </>
      )}

      {state.status === 'no-weight' && (
        <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">Log a weigh-in to see your targets.</p>
      )}

      <InstallCard dismissible />

      <NextWorkoutCard />

      <PhotoReminderBanner today={today} />

      <BackupBanner today={today} />

      {(state.status === 'ready' || state.status === 'no-weight') && (
        <WeightQuickLog today={today} loggedToday={todayLog?.weightKg} />
      )}
    </section>
  )
}
