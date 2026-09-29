import { ChoiceList } from '../../components/ChoiceList'
import { Field } from '../../components/Field'
import type { ProfileDraft, ProfileErrors } from '../../engine/profile'
import { ACTIVITY_CHOICES, GOAL_CHOICES, INTENSITY_CHOICES, SEX_CHOICES } from './options'

export interface SectionProps {
  draft: ProfileDraft
  set: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void
  errors: ProfileErrors
}

export function BasicsSection({ draft, set, errors, today }: SectionProps & { today: string }) {
  return (
    <div className="space-y-5">
      <Field label="Name" value={draft.name} onChange={(v) => set('name', v)} error={errors.name} autoComplete="given-name" />
      <ChoiceList label="Sex" choices={SEX_CHOICES} value={draft.sex} onChange={(v) => set('sex', v)} error={errors.sex} inline />
      <Field label="Date of birth" type="date" max={today} value={draft.dob} onChange={(v) => set('dob', v)} error={errors.dob} />
    </div>
  )
}

export function BodySection({ draft, set, errors, includeWeight = true }: SectionProps & { includeWeight?: boolean }) {
  return (
    <div className="space-y-5">
      <Field
        label="Height"
        suffix="cm"
        inputMode="decimal"
        value={draft.heightCm}
        onChange={(v) => set('heightCm', v)}
        error={errors.heightCm}
      />
      {includeWeight && (
        <Field
          label="Current weight"
          suffix="kg"
          inputMode="decimal"
          value={draft.weightKg}
          onChange={(v) => set('weightKg', v)}
          error={errors.weightKg}
        />
      )}
    </div>
  )
}

export function ActivitySection({ draft, set, errors }: SectionProps) {
  return (
    <div className="space-y-3">
      <ChoiceList
        label="Activity level"
        choices={ACTIVITY_CHOICES}
        value={draft.activityLevel}
        onChange={(v) => set('activityLevel', v)}
        error={errors.activityLevel}
      />
      <p className="text-sm text-muted">
        Include your planned training. Workout and cardio calories are never added on top, so don't count them twice.
      </p>
    </div>
  )
}

export function GoalSection({ draft, set, errors }: SectionProps) {
  const intensities = draft.goal === 'fat_loss' || draft.goal === 'muscle_gain' ? INTENSITY_CHOICES[draft.goal] : null
  return (
    <div className="space-y-5">
      <ChoiceList label="Goal" choices={GOAL_CHOICES} value={draft.goal} onChange={(v) => set('goal', v)} error={errors.goal} />
      {intensities && (
        <ChoiceList label="Intensity" choices={intensities} value={draft.intensity} onChange={(v) => set('intensity', v)} />
      )}
    </div>
  )
}
