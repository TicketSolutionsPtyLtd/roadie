export type UrgencyLevel = 'success' | 'warning' | 'danger' | 'expired'

/**
 * Map remaining seconds to an urgency level. Thresholds confirmed against the
 * website's `CartUrgencyBadge.tsx` (<120 → danger, <300 → warning, else
 * success). `null` (no expiry) → success; `<= 0` → expired (the explicit
 * expired state is new — the website never modelled it; skins use it to fire
 * `onExpire`).
 */
export function urgencyLevel(remaining: number | null): UrgencyLevel {
  if (remaining === null) return 'success'
  if (remaining <= 0) return 'expired'
  if (remaining < 120) return 'danger'
  if (remaining < 300) return 'warning'
  return 'success'
}

export function remainingSeconds(
  expiresAtUtc: string | undefined,
  now: number
): number | null {
  if (!expiresAtUtc) return null
  return Math.max(
    0,
    Math.floor((new Date(expiresAtUtc).getTime() - now) / 1000)
  )
}
