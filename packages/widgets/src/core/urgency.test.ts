import { describe, expect, it } from 'vitest'

import { remainingSeconds, urgencyLevel } from './urgency'
import type { UrgencyLevel } from './urgency'

describe('urgencyLevel', () => {
  // Thresholds use strict `<` (verified against the website's
  // CartUrgencyBadge.tsx): `< 120 → danger`, `< 300 → warning`, else success.
  // So exactly 300 is NOT `< 300` (→ success) and exactly 120 is NOT `< 120`
  // (→ warning). The boundaries below reflect that strict-comparison contract.
  it.each<[number | null, UrgencyLevel]>([
    [null, 'success'],
    [600, 'success'],
    [300, 'success'],
    [299, 'warning'],
    [120, 'warning'],
    [119, 'danger'],
    [1, 'danger'],
    [0, 'expired']
  ])('remaining %s → %s', (rem: number | null, level: UrgencyLevel) => {
    expect(urgencyLevel(rem)).toBe(level)
  })
})

describe('remainingSeconds', () => {
  it('computes floor of (expiry - now) clamped at 0', () => {
    const now = Date.parse('2026-06-15T00:00:00Z')
    expect(remainingSeconds('2026-06-15T00:02:30Z', now)).toBe(150)
    expect(remainingSeconds('2026-06-14T23:00:00Z', now)).toBe(0)
  })
  it('returns null when no expiry', () => {
    expect(remainingSeconds(undefined, Date.now())).toBeNull()
  })
})
