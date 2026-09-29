import { useCallback, useState } from 'react'
import type { ProfileDraft } from '../../engine/profile'

export const EMPTY_DRAFT: ProfileDraft = {
  name: '',
  sex: '',
  dob: '',
  heightCm: '',
  weightKg: '',
  activityLevel: '',
  goal: '',
  intensity: 'moderate',
}

export function useDraft(initial: ProfileDraft) {
  const [draft, setDraft] = useState(initial)
  const set = useCallback(<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }, [])
  return { draft, set, reset: setDraft }
}
