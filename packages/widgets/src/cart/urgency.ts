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
  // Non-finite (e.g. NaN from an unparseable expiry) is fail-safe → expired,
  // never silently 'success' by falling through every `<` comparison.
  if (!Number.isFinite(remaining)) return 'expired'
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
  const expiry = new Date(expiresAtUtc).getTime()
  // Malformed expiry → treat as already expired (0), distinct from `null`
  // (no expiry). Returning NaN here would slip past urgencyLevel as success.
  if (!Number.isFinite(expiry)) return 0
  return Math.max(0, Math.floor((expiry - now) / 1000))
}
