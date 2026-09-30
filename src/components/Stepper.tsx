import { useState } from 'react'
import { QTY_STEP } from '../engine/food'
import { parseDecimal } from '../engine/profile'

interface Props {
  value: number
  onChange: (value: number) => void
  label: string
  /** Lowest allowed value; 0 lets a row be skipped. */
  min?: number
  max?: number
  /** Food quantities use 0.5 (CLAUDE.md); counts like sets use 1. */
  step?: number
  size?: 'md' | 'sm'
}

/** − / + in fixed steps (0.5 by default) with tap-to-type. */
export function Stepper({ value, onChange, label, min = QTY_STEP, max = Infinity, step = QTY_STEP, size = 'md' }: Props) {
  const snap = (n: number) => Math.min(max, Math.max(min, Math.round(n / step) * step))
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)

  const commit = () => {
    const n = parseDecimal(text)
    const next = Number.isNaN(n) ? value : snap(n)
    if (next !== value) onChange(next)
  }

  const btn = size === 'md' ? 'h-12 w-12 text-2xl' : 'h-11 w-11 text-xl'

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(snap(value - step))}
        className={`${btn} rounded-xl border border-line bg-surface leading-none disabled:opacity-30 active:bg-line`}
      >
        −
      </button>
      <input
        inputMode="decimal"
        aria-label={label}
        value={focused ? text : String(value)}
        onFocus={(e) => {
          setText(String(value))
          setFocused(true)
          e.target.select()
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false)
          commit()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className={`${size === 'md' ? 'h-12 w-16 text-xl' : 'h-11 w-14 text-lg'} rounded-xl bg-surface text-center font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent`}
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(snap(value + step))}
        className={`${btn} rounded-xl border border-line bg-surface leading-none disabled:opacity-30 active:bg-line`}
      >
        +
      </button>
    </div>
  )
}
