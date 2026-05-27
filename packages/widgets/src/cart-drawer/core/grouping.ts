import type { CartEvent } from './types'

export interface DayGroup {
  key: string // venue-local YYYY-MM-DD
  events: CartEvent[]
}

export function groupEventsByDay(events: CartEvent[]): DayGroup[] {
  const ordered = [...events].sort((a, b) =>
    a.eventStartAtUtc.localeCompare(b.eventStartAtUtc)
  )
  const map = new Map<string, CartEvent[]>()
  for (const e of ordered) {
    const bucket = map.get(e.eventDateKey)
    if (bucket) bucket.push(e)
    else map.set(e.eventDateKey, [e])
  }
  return Array.from(map.entries())
    .map(([key, evs]) => ({ key, events: evs }))
    .sort((a, b) => a.key.localeCompare(b.key))
}
