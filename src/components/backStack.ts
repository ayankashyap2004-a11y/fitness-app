/**
 * Android Back button handling for the APK. Open sheets register a close handler; Back runs
 * the most recent one. With nothing open, App decides (go to Today, then minimise).
 */
const stack: (() => void)[] = []

export function pushBackHandler(fn: () => void): () => void {
  stack.push(fn)
  return () => {
    const i = stack.lastIndexOf(fn)
    if (i >= 0) stack.splice(i, 1)
  }
}

/** Runs the top handler. Returns false when nothing is open. */
export function handleBack(): boolean {
  const fn = stack[stack.length - 1]
  if (!fn) return false
  fn()
  return true
}
