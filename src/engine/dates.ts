// Calendar dates as local 'YYYY-MM-DD' strings. These compare correctly as plain strings.

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parts(iso: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) throw new Error(`Invalid date: ${iso}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = parts(iso)
  return toISODate(new Date(y, m - 1, d + days))
}

/** Whole years between dob and the given day. */
export function ageOn(dob: string, today: string): number {
  const [by, bm, bd] = parts(dob)
  const [ty, tm, td] = parts(today)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age -= 1
  return age
}
