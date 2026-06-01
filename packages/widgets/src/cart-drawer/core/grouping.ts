import type { CartEvent } from './types'

export interface DayGroup {
  key: string // venue-local YYYY-MM-DD
  events: CartEvent[]
}

// The cart payload is untrusted (see client.ts trust-seam). A consumer that
// omits the ordering/grouping keys must degrade gracefully — show its items —
// not crash the whole list with "Cannot read properties of undefined (reading
// 'localeCompare')". Coerce a possibly-absent key to a string so neither sort
// can dereference undefined. Typed `string | null | undefined` (not the
// declared `string`) precisely because the runtime value can defy the type.
function keyOf(value: string | null | undefined): string {
  return typeof value === 'string' ? value : ''
}

// Ascending compare that sorts blank/missing keys AFTER present ones, so
// undated events trail the dated ones instead of jumping to the top.
function compareKeys(a: string, b: string): number {
  if (a === b) return 0
  if (a === '') return 1
  if (b === '') return -1
  return a.localeCompare(b)
}

export function groupEventsByDay(events: CartEvent[]): DayGroup[] {
  const ordered = [...events].sort((a, b) =>
    compareKeys(keyOf(a.eventStartAtUtc), keyOf(b.eventStartAtUtc))
  )
  const map = new Map<string, CartEvent[]>()
  for (const e of ordered) {
    const key = keyOf(e.eventDateKey)
    const bucket = map.get(key)
    if (bucket) bucket.push(e)
    else map.set(key, [e])
  }
  return Array.from(map.entries())
    .map(([key, evs]) => ({ key, events: evs }))
    .sort((a, b) => compareKeys(a.key, b.key))
}
