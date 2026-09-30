import { useState } from 'react'
import { useActiveSession, useExercises, useTemplates } from '../../db/hooks'
import { ActiveSession } from './ActiveSession'
import { SessionSummary } from './SessionSummary'
import { StartWorkout } from './StartWorkout'
import { TemplateEditor } from './TemplateEditor'

export function WorkoutScreen() {
  const session = useActiveSession()
  const templates = useTemplates()
  const exercises = useExercises()
  const [finishedId, setFinishedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)

  if (session === undefined || !templates || !exercises) return null

  if (finishedId !== null) return <SessionSummary sessionId={finishedId} onDone={() => setFinishedId(null)} />
  if (session) return <ActiveSession session={session} onFinished={setFinishedId} />

  const editDay = editing !== null ? templates.find((t) => t.dayIndex === editing) : undefined
  if (editDay) return <TemplateEditor day={editDay} library={exercises} onClose={() => setEditing(null)} />

  return <StartWorkout onEdit={setEditing} />
}
