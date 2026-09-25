const ISO =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

function wallTimeOf(value: string): number | null {
  const match = ISO.exec(value)
  if (!match) return null
  const [y, m, d, h, min] = match.slice(1).map((part) => Number(part ?? 0))
  const ms = Date.UTC(y!, m! - 1, d!, h, min)
  const date = new Date(ms)
  // Date.UTC rolls 31 February into March; a real date survives the round trip.
  const real =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m! - 1 &&
    date.getUTCDate() === d &&
    date.getUTCHours() === h &&
    date.getUTCMinutes() === min
  return real ? ms : null
}

export const isWallTime = (value: unknown): value is string =>
  typeof value === 'string' && wallTimeOf(value) !== null

/**
 * Milliseconds for the venue wall time written in an ISO string, read as UTC
 * so it never shifts by time zone. An offset is ignored by design. Numbers
 * pass through; anything else, including a date that doesn't exist, is null.
 */
export function parseWallTime(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  return typeof value === 'string' ? wallTimeOf(value) : null
}
