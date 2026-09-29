import { useState } from 'react'
import { Button } from '../../components/Button'
import { draftFromProfile, updateProfile } from '../../db/profile'
import { db } from '../../db/schema'
import type { Profile } from '../../db/types'
import { parseDecimal, validateProfile, type ProfileErrors, type ProfileField } from '../../engine/profile'
import { computeTargets, type Targets } from '../../engine/targets'
import { ActivitySection, BasicsSection, BodySection, GoalSection } from '../onboarding/ProfileSections'
import { useDraft } from '../onboarding/useDraft'

const FIELDS: ProfileField[] = ['name', 'sex', 'dob', 'heightCm', 'activityLevel', 'goal']

interface Props {
  profile: Profile
  weightKg: number | undefined
  current: Targets | undefined
  today: string
  onDone: () => void
}

export function ProfileEditor({ profile, weightKg, current, today, onDone }: Props) {
  const { draft, set } = useDraft(draftFromProfile(profile))
  const [errors, setErrors] = useState<ProfileErrors>({})

  const liveErrors = validateProfile(draft, today, FIELDS)
  const valid = Object.keys(liveErrors).length === 0

  const preview =
    valid && weightKg !== undefined && draft.sex && draft.activityLevel && draft.goal
      ? computeTargets({
          sex: draft.sex,
          dob: draft.dob,
          heightCm: parseDecimal(draft.heightCm),
          activityLevel: draft.activityLevel,
          goal: draft.goal,
          intensity: draft.intensity,
          weightKg,
          today,
        })
      : null
  const changed = preview && current && (preview.kcal !== current.kcal || preview.protein !== current.protein)

  const save = async () => {
    setErrors(liveErrors)
    if (!valid) return
    await updateProfile(db, draft)
    onDone()
  }

  const sectionProps = { draft, set, errors }

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <BasicsSection {...sectionProps} today={today} />
      <BodySection {...sectionProps} includeWeight={false} />
      <ActivitySection {...sectionProps} />
      <GoalSection {...sectionProps} />

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 space-y-2 bg-surface px-4 py-3">
        {changed && (
          <p className="text-center text-sm text-muted">
            New targets: <span className="text-ink tabular-nums">{preview.kcal} kcal</span>,{' '}
            <span className="text-protein tabular-nums">{preview.protein} g protein</span>
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onDone} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-[2]">
            Save
          </Button>
        </div>
      </div>
    </form>
  )
}
