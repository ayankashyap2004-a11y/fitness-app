import type { Choice } from '../../components/ChoiceList'
import type { ActivityLevel, Goal, Intensity, Sex } from '../../engine/types'

export const SEX_CHOICES: Choice<Sex>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export const ACTIVITY_CHOICES: Choice<ActivityLevel>[] = [
  { value: 'sedentary', label: 'Sedentary', detail: 'Desk job, little walking' },
  { value: 'light', label: 'Lightly active', detail: 'Some walking, light exercise 1–3 days' },
  { value: 'moderate', label: 'Moderately active', detail: 'Training 3–5 days' },
  { value: 'very', label: 'Very active', detail: 'Hard training 6–7 days or a physical job' },
]

export const GOAL_CHOICES: Choice<Goal>[] = [
  { value: 'fat_loss', label: 'Fat loss', detail: 'Lose fat while keeping muscle' },
  { value: 'muscle_gain', label: 'Muscle gain', detail: 'Small surplus to build muscle' },
  { value: 'recomp', label: 'Gaintain (recomp)', detail: 'Eat at maintenance, train hard' },
]

export const INTENSITY_CHOICES: Record<'fat_loss' | 'muscle_gain', Choice<Intensity>[]> = {
  fat_loss: [
    { value: 'mild', label: 'Mild', detail: '−250 kcal a day' },
    { value: 'moderate', label: 'Moderate', detail: '−500 kcal a day (recommended)' },
    { value: 'aggressive', label: 'Aggressive', detail: '−750 kcal a day, more muscle-loss risk' },
  ],
  muscle_gain: [
    { value: 'mild', label: 'Mild', detail: '+5% above maintenance' },
    { value: 'moderate', label: 'Moderate', detail: '+10% above maintenance (recommended)' },
    { value: 'aggressive', label: 'Aggressive', detail: '+15%, more fat gain' },
  ],
}
