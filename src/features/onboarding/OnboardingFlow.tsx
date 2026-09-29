import { useState } from 'react'
import { Button } from '../../components/Button'
import { useToday } from '../../db/hooks'
import { completeOnboarding } from '../../db/profile'
import { db } from '../../db/schema'
import { parseDecimal, validateProfile, type ProfileErrors, type ProfileField } from '../../engine/profile'
import { computeTargets } from '../../engine/targets'
import { ActivitySection, BasicsSection, BodySection, GoalSection } from './ProfileSections'
import { TargetsSummary } from './TargetsSummary'
import { EMPTY_DRAFT, useDraft } from './useDraft'

const STEPS: { title: string; subtitle: string; fields: ProfileField[] }[] = [
  { title: 'About you', subtitle: 'Used for your calorie maths. Stays on this phone.', fields: ['name', 'sex', 'dob'] },
  { title: 'Your body', subtitle: 'Weigh yourself in the morning if you can.', fields: ['heightCm', 'weightKg'] },
  { title: 'How active are you?', subtitle: 'Pick the level that matches a normal week.', fields: ['activityLevel'] },
  { title: 'Your goal', subtitle: 'You can change this any time in Settings.', fields: ['goal'] },
  { title: 'Your daily targets', subtitle: 'These update as your 7-day average weight changes.', fields: [] },
]

export function OnboardingFlow() {
  const today = useToday()
  const { draft, set } = useDraft(EMPTY_DRAFT)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [saving, setSaving] = useState(false)

  const current = STEPS[step]!
  const isLast = step === STEPS.length - 1

  const next = async () => {
    if (isLast) {
      setSaving(true)
      try {
        await completeOnboarding(db, draft, today)
      } finally {
        setSaving(false)
      }
      return
    }
    const stepErrors = validateProfile(draft, today, current.fields)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length === 0) {
      setStep(step + 1)
      window.scrollTo(0, 0)
    }
  }

  const back = () => {
    setErrors({})
    setStep(step - 1)
  }

  const targets =
    isLast && draft.sex && draft.activityLevel && draft.goal
      ? computeTargets({
          sex: draft.sex,
          dob: draft.dob,
          heightCm: parseDecimal(draft.heightCm),
          weightKg: parseDecimal(draft.weightKg),
          activityLevel: draft.activityLevel,
          goal: draft.goal,
          intensity: draft.intensity,
          today,
        })
      : null

  const sectionProps = { draft, set, errors }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <span key={s.title} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </div>

      <header className="mt-6 mb-6">
        <h1 className="text-2xl font-semibold">{current.title}</h1>
        <p className="mt-1 text-sm text-muted">{current.subtitle}</p>
      </header>

      <form
        className="flex flex-1 flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void next()
        }}
      >
        <div className="flex-1">
          {step === 0 && <BasicsSection {...sectionProps} today={today} />}
          {step === 1 && <BodySection {...sectionProps} />}
          {step === 2 && <ActivitySection {...sectionProps} />}
          {step === 3 && <GoalSection {...sectionProps} />}
          {targets && <TargetsSummary targets={targets} />}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-6 flex gap-3 bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {step > 0 && (
            <Button variant="secondary" onClick={back} className="flex-1">
              Back
            </Button>
          )}
          <Button type="submit" className="flex-[2]" disabled={saving}>
            {isLast ? 'Start tracking' : 'Next'}
          </Button>
        </div>
      </form>
    </div>
  )
}
