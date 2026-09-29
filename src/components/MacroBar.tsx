interface Props {
  label: string
  consumed: number
  target: number
  unit: string
  /** Tailwind bg-* class for the fill. */
  color: string
  /** Protein is shown larger (PRD §4.2 display). */
  emphasis?: boolean
}

export function MacroBar({ label, consumed, target, unit, color, emphasis = false }: Props) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const left = Math.round(target - consumed)
  const over = left < 0

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={emphasis ? 'text-base font-semibold' : 'text-sm text-muted'}>{label}</span>
        <span className={emphasis ? 'text-base font-semibold tabular-nums' : 'text-sm tabular-nums'}>
          {Math.round(consumed)}
          <span className="text-muted"> / {target} {unit}</span>
        </span>
      </div>
      <div
        className={`mt-1.5 overflow-hidden rounded-full bg-line ${emphasis ? 'h-3' : 'h-2'}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.round(consumed)}
      >
        <div className={`h-full rounded-full ${over ? 'bg-amber-400' : color}`} style={{ width: `${pct}%` }} />
      </div>
      {emphasis && (
        <p className={`mt-1 text-xs ${over ? 'text-amber-400' : 'text-muted'}`}>
          {over ? `${-left} ${unit} over` : `${left} ${unit} to go`}
        </p>
      )}
    </div>
  )
}
