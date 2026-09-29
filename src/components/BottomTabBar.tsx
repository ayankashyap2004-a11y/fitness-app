import type { ReactNode } from 'react'

export type TabId = 'today' | 'food' | 'workout' | 'progress' | 'settings'

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
)

export const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'today', label: 'Today', icon: icon(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>) },
  { id: 'food', label: 'Food', icon: icon(<><path d="M3 11h18a9 9 0 0 1-18 0Z" /><path d="M12 3v4M8 5v2M16 5v2" /></>) },
  { id: 'workout', label: 'Workout', icon: icon(<><path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" /></>) },
  { id: 'progress', label: 'Progress', icon: icon(<><path d="M3 20h18" /><path d="m4 15 5-5 4 3 7-7" /></>) },
  { id: 'settings', label: 'Settings', icon: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>) },
]

interface Props {
  active: TabId
  onChange: (tab: TabId) => void
}

export function BottomTabBar({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-muted active:text-ink'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
