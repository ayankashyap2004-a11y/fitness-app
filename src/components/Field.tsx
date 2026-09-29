import { useId, type InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string
  value: string
  onChange: (value: string) => void
  suffix?: string
  error?: string
}

export function Field({ label, value, onChange, suffix, error, ...input }: Props) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-center rounded-xl border bg-card px-3 focus-within:border-accent ${
          error ? 'border-red-400' : 'border-line'
        }`}
      >
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="w-full min-w-0 bg-transparent py-3 text-base text-ink outline-none [color-scheme:dark]"
          {...input}
        />
        {suffix && <span className="pl-2 text-muted">{suffix}</span>}
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
