const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/

export const isWallTime = (value: unknown): value is string =>
  typeof value === 'string' && ISO.test(value)

/**
 * Milliseconds for the venue wall time written in an ISO string, read as UTC
 * so it never shifts by time zone. An offset is ignored by design. Numbers
 * pass through; anything else is null.
 */
export function parseWallTime(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const match = ISO.exec(value)
  if (!match) return null
  const [, y, m, d, h = '0', min = '0'] = match
  return Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min))
}
