import { formatClock } from '../../engine/workout'
import type { RestTimer } from './useRestTimer'

/** Sticky rest countdown above the tab bar, with +30 s and Skip. */
export function RestBar({ timer }: { timer: RestTimer }) {
  if (timer.remaining === null) return null
  const done = timer.remaining === 0
  return (
    <div
      role="timer"
      aria-live={done ? 'assertive' : 'off'}
      className={`fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md items-center gap-2 border-t px-4 py-2 ${
        done ? 'border-accent bg-accent text-surface' : 'border-line bg-card'
      }`}
    >
      <span className="flex-1 text-sm">
        {done ? 'Rest done: next set' : 'Rest'}
        {!done && <span className="ml-2 text-2xl font-semibold tabular-nums">{formatClock(timer.remaining)}</span>}
      </span>
      {!done && (
        <button type="button" onClick={() => timer.add(30)} className="min-h-11 rounded-lg px-3 text-sm text-accent active:bg-line">
          +30 s
        </button>
      )}
      <button
        type="button"
        onClick={timer.skip}
        className={`min-h-11 rounded-lg px-3 text-sm ${done ? 'font-semibold' : 'text-muted active:bg-line'}`}
      >
        {done ? 'OK' : 'Skip'}
      </button>
    </div>
  )
}
