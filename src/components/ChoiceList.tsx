import { useId } from 'react'

export interface Choice<T extends string> {
  value: T
  label: string
  detail?: string
}

interface Props<T extends string> {
  label: string
  choices: readonly Choice<T>[]
  value: T | ''
  onChange: (value: T) => void
  error?: string
  /** Lay short options side by side. */
  inline?: boolean
}

export function ChoiceList<T extends string>({ label, choices, value, onChange, error, inline = false }: Props<T>) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm text-muted">{label}</legend>
      <div className={inline ? 'grid grid-flow-col auto-cols-fr gap-2' : 'space-y-2'}>
        {choices.map((c) => {
          const checked = c.value === value
          return (
            <label
              key={c.value}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                checked ? 'border-accent bg-accent/10' : 'border-line bg-card'
              } ${inline ? 'justify-center text-center' : ''}`}
            >
              <input
                type="radio"
                name={name}
                value={c.value}
                checked={checked}
                onChange={() => onChange(c.value)}
                className="sr-only"
              />
              <span>
                <span className="block text-base">{c.label}</span>
                {c.detail && <span className="block text-sm text-muted">{c.detail}</span>}
              </span>
            </label>
          )
        })}
      </div>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </fieldset>
  )
}
