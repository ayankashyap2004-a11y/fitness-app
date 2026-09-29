import { useState } from 'react'
import { Button } from '../../components/Button'
import { logWeight } from '../../db/profile'
import { db } from '../../db/schema'
import { LIMITS, parseDecimal } from '../../engine/profile'

interface Props {
  today: string
  loggedToday?: number
}

export function WeightQuickLog({ today, loggedToday }: Props) {
  const [value, setValue] = useState('')
  const [editing, setEditing] = useState(false)

  const kg = parseDecimal(value)
  const valid = kg >= LIMITS.weightKg[0] && kg <= LIMITS.weightKg[1]

  const save = async () => {
    if (!valid) return
    await logWeight(db, today, Math.round(kg * 10) / 10)
    setValue('')
    setEditing(false)
  }

  if (loggedToday !== undefined && !editing) {
    return (
      <div className="flex min-h-12 items-center justify-between rounded-2xl border border-line bg-card px-4">
        <span className="text-sm text-muted">
          Today's weight: <span className="text-ink tabular-nums">{loggedToday} kg</span>
        </span>
        <button type="button" className="min-h-11 px-2 text-sm text-accent" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
    )
  }

  return (
    <form
      className="flex items-center gap-2 rounded-2xl border border-line bg-card p-2 pl-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <label htmlFor="weigh-in" className="text-sm text-muted">
        Weigh-in
      </label>
      <input
        id="weigh-in"
        inputMode="decimal"
        placeholder={loggedToday !== undefined ? String(loggedToday) : 'kg'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-11 w-full min-w-0 flex-1 rounded-lg bg-surface px-3 text-base tabular-nums outline-none focus:ring-2 focus:ring-accent"
      />
      <Button type="submit" disabled={!valid} className="shrink-0">
        Log
      </Button>
    </form>
  )
}
