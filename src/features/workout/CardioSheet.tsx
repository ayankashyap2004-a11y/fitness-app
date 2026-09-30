import { useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { addCardio, deleteCardio, updateCardio } from '../../db/cardio'
import { useTargets } from '../../db/hooks'
import { db } from '../../db/schema'
import type { CardioLog } from '../../db/types'
import { CARDIO_TYPES, SPEED_TYPES, estimateCardioKcal, validateCardio, type CardioType, type PickleballIntensity } from '../../engine/cardio'
import { parseDecimal } from '../../engine/profile'
import { CARDIO_LABELS } from './labels'

const INTENSITIES: { value: PickleballIntensity; label: string; detail: string }[] = [
  { value: 'doubles', label: 'Casual / doubles', detail: '≈ 4.1 METs' },
  { value: 'singles', label: 'Competitive / singles', detail: '≈ 5.8 METs' },
]

interface Props {
  today: string
  /** Edit an existing entry, or add a new one. */
  entry?: CardioLog
  onClose: () => void
}

const optional = (s: string) => (s.trim() ? parseDecimal(s) : undefined)

export function CardioSheet({ today, entry, onClose }: Props) {
  const targets = useTargets(today)
  const [type, setType] = useState<CardioType>(entry?.type ?? 'walk')
  const [date, setDate] = useState(entry?.date ?? today)
  const [minutes, setMinutes] = useState(entry ? String(entry.durationMin) : '')
  const [km, setKm] = useState(entry?.distanceKm !== undefined ? String(entry.distanceKm) : '')
  const [speed, setSpeed] = useState(entry?.speedKmh !== undefined ? String(entry.speedKmh) : '')
  const [incline, setIncline] = useState(entry?.inclinePct !== undefined ? String(entry.inclinePct) : '')
  const [intensity, setIntensity] = useState<PickleballIntensity>(entry?.intensity ?? 'doubles')
  const [note, setNote] = useState(entry?.note ?? '')
  const [touched, setTouched] = useState(false)

  const treadmill = SPEED_TYPES.includes(type)
  const durationMin = parseDecimal(minutes)
  const distanceKm = optional(km)
  const speedKmh = treadmill ? optional(speed) : undefined
  const inclinePct = treadmill ? optional(incline) : undefined
  const errors = validateCardio(durationMin, distanceKm, speedKmh, inclinePct)
  const valid = Object.keys(errors).length === 0 && date <= today

  // Estimate from the 7-day average weight; display only.
  const weightKg = targets.status === 'ready' ? targets.weight.weightKg : undefined
  const kcal = valid
    ? estimateCardioKcal({ type, durationMin, distanceKm, speedKmh, inclinePct, intensity: type === 'pickleball' ? intensity : undefined }, weightKg)
    : null

  const save = async () => {
    setTouched(true)
    if (!valid) return
    const input = {
      date,
      type,
      durationMin,
      distanceKm,
      speedKmh,
      inclinePct,
      intensity: type === 'pickleball' ? intensity : undefined,
      kcalEstimate: kcal ?? undefined,
      note,
    }
    if (entry?.id !== undefined) await updateCardio(db, entry.id, input)
    else await addCardio(db, input)
    onClose()
  }

  return (
    <BottomSheet
      title={entry ? 'Edit cardio' : 'Log cardio'}
      onClose={onClose}
      footer={
        <div className="space-y-2">
          <p className="text-center text-sm text-muted tabular-nums" aria-live="polite">
            {kcal !== null ? (
              <>
                ≈ <span className="font-semibold text-ink">{kcal} kcal</span> burned (estimate, not added to your target)
              </>
            ) : treadmill ? (
              'Add speed or distance to see an estimate'
            ) : type === 'pickleball' ? (
              'Add a duration to see an estimate'
            ) : (
              'No calorie estimate for this type yet'
            )}
          </p>
          <div className="flex gap-3">
            {entry?.id !== undefined && (
              <Button
                variant="secondary"
                className="flex-1 text-red-300"
                onClick={async () => {
                  await deleteCardio(db, entry.id!)
                  onClose()
                }}
              >
                Delete
              </Button>
            )}
            <Button className="flex-[2]" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <fieldset>
          <legend className="mb-1.5 text-sm text-muted">Type</legend>
          <div className="grid grid-cols-4 gap-1.5">
            {CARDIO_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={t === type}
                onClick={() => setType(t)}
                className={`min-h-11 rounded-lg px-1 text-sm ${t === type ? 'bg-accent/15 text-accent' : 'bg-surface text-muted'}`}
              >
                {CARDIO_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration" suffix="min" inputMode="numeric" value={minutes} onChange={setMinutes} error={touched ? errors.durationMin : undefined} />
          <Field label="Distance (optional)" suffix="km" inputMode="decimal" value={km} onChange={setKm} error={touched ? errors.distanceKm : undefined} />
        </div>

        {treadmill && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Speed (optional)" suffix="km/h" inputMode="decimal" value={speed} onChange={setSpeed} error={touched ? errors.speedKmh : undefined} />
            <Field label="Incline (optional)" suffix="%" inputMode="decimal" value={incline} onChange={setIncline} error={touched ? errors.inclinePct : undefined} />
          </div>
        )}

        {type === 'pickleball' && (
          <fieldset>
            <legend className="mb-1.5 text-sm text-muted">How hard</legend>
            <div className="grid grid-cols-2 gap-2">
              {INTENSITIES.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  aria-pressed={i.value === intensity}
                  onClick={() => setIntensity(i.value)}
                  className={`min-h-12 rounded-xl px-2 py-1.5 text-sm ${i.value === intensity ? 'bg-accent/15 text-accent' : 'bg-surface text-muted'}`}
                >
                  <span className="block">{i.label}</span>
                  <span className="block text-xs opacity-80">{i.detail}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <Field label="Date" type="date" max={today} value={date} onChange={setDate} />
        <Field label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. evening walk around campus" />
        <p className="text-xs text-muted">
          Estimates use your 7-day average weight: ACSM equations for walking and running (speed and incline), and published METs for
          pickleball. Your activity level already covers exercise, so cardio is never added to your calorie target.
        </p>
      </div>
    </BottomSheet>
  )
}
