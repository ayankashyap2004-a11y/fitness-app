import { useState } from 'react'
import { QTY_STEP, snapQty } from '../engine/food'
import { parseDecimal } from '../engine/profile'

interface Props {
  value: number
  onChange: (value: number) => void
  label: string
  /** Lowest allowed value; 0 lets a row be skipped. */
  min?: number
  size?: 'md' | 'sm'
}

/** − / + in 0.5 steps with tap-to-type. */
export function Stepper({ value, onChange, label, min = QTY_STEP, size = 'md' }: Props) {
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)

  const commit = () => {
    const n = parseDecimal(text)
    const next = Number.isNaN(n) ? value : snapQty(n, min)
    if (next !== value) onChange(next)
  }

  const btn = size === 'md' ? 'h-12 w-12 text-2xl' : 'h-11 w-11 text-xl'

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - QTY_STEP))}
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
        onClick={() => onChange(value + QTY_STEP)}
        className={`${btn} rounded-xl border border-line bg-surface leading-none active:bg-line`}
      >
        +
      </button>
    </div>
  )
}
