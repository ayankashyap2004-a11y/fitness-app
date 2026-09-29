import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: Props) {
  const look =
    variant === 'primary'
      ? 'bg-accent text-surface font-semibold disabled:opacity-40'
      : 'border border-line bg-card text-ink disabled:opacity-40'
  return <button type={type} className={`min-h-12 rounded-xl px-4 text-base active:opacity-80 ${look} ${className}`} {...rest} />
}
