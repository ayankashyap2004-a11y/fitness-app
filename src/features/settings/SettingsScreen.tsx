import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTargets, useToday } from '../../db/hooks'
import { db } from '../../db/schema'
import { ACTIVITY_CHOICES, GOAL_CHOICES } from '../onboarding/options'
import { ProfileEditor } from './ProfileEditor'

export function SettingsScreen() {
  const today = useToday()
  const state = useTargets(today)
  const meta = useLiveQuery(() => db.appMeta.get(1))
  const [editing, setEditing] = useState(false)

  if (state.status === 'loading' || state.status === 'no-profile') return null
  const { profile } = state
  const ready = state.status === 'ready' ? state : undefined

  if (editing) {
    return (
      <section className="px-4 pt-6">
        <h1 className="mb-6 text-2xl font-semibold">Edit profile</h1>
        <ProfileEditor
          profile={profile}
          weightKg={ready?.weight.weightKg}
          current={ready?.targets}
          today={today}
          onDone={() => {
            setEditing(false)
            window.scrollTo(0, 0)
          }}
        />
      </section>
    )
  }

  const goalLabel = GOAL_CHOICES.find((g) => g.value === profile.goal)?.label
  const intensity = profile.goal === 'recomp' ? '' : ` · ${profile.intensity[0]!.toUpperCase()}${profile.intensity.slice(1)}`

  return (
    <section className="space-y-4 px-4 pt-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-2xl border border-line bg-card">
        <dl className="divide-y divide-line px-4 text-sm">
          <Row label="Name" value={profile.name} />
          <Row label="Height" value={`${profile.heightCm} cm`} />
          <Row label="Activity" value={ACTIVITY_CHOICES.find((a) => a.value === profile.activityLevel)?.label ?? ''} />
          <Row label="Goal" value={`${goalLabel}${intensity}`} />
          {ready && <Row label="Targets" value={`${ready.targets.kcal} kcal · ${ready.targets.protein} g protein`} />}
        </dl>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-h-12 w-full border-t border-line text-base text-accent active:bg-line/50"
        >
          Edit profile
        </button>
      </div>

      <dl className="rounded-2xl border border-line bg-card px-4 text-sm">
        <Row
          label="Storage"
          value={meta === undefined ? '…' : meta.persistGranted ? 'Persistent' : 'Best-effort (may be cleared by the browser)'}
          valueClass={meta?.persistGranted ? 'text-accent' : undefined}
        />
      </dl>

      <p className="px-1 text-xs text-muted">Backup and reminders arrive in Phase 9.</p>
    </section>
  )
}

function Row({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right ${valueClass}`}>{value}</dd>
    </div>
  )
}
