import type { Muscle, TrainingMode } from '../../engine/workout'

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'chest',
  back: 'back',
  front_delts: 'front delts',
  side_delts: 'side delts',
  rear_delts: 'rear delts',
  biceps: 'biceps',
  triceps: 'triceps',
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  abs: 'abs',
}

export const MODE_LABELS: Record<TrainingMode, string> = { gym: 'Gym', home: 'Home' }
