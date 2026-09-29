import type { ReactNode } from 'react'

interface Props {
  title: string
  phase: string
  children?: ReactNode
}

/** Temporary body for screens that later phases fill in. */
export function ScreenPlaceholder({ title, phase, children }: Props) {
  return (
    <section className="px-4 pt-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-4 rounded-2xl border border-line bg-card p-4 text-sm text-muted">
        <p>Coming in {phase}.</p>
        {children}
      </div>
    </section>
  )
}
