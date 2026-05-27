import { remainingSeconds, urgencyLevel } from './urgency'

export interface ExpiryWatcher {
  /** Stop polling. Safe to call more than once. */
  stop(): void
}

/**
 * Poll until `expiresAtUtc` reaches the expired state, then fire `onExpire`
 * exactly once. Returns a stop handle. Pure scheduling — both skins wire it to
 * their lifecycle (React effect cleanup / Vue onBeforeUnmount) and recreate it
 * when the expiry changes, which resets the once-latch.
 *
 * Callers should only create a watcher when they have an expiry to watch; an
 * empty/undefined expiry never reaches the expired state.
 */
export function createExpiryWatcher(
  expiresAtUtc: string | undefined,
  onExpire: () => void,
  intervalMs = 1000,
  now: () => number = Date.now
): ExpiryWatcher {
  let fired = false
  const check = (): void => {
    if (fired) return
    if (urgencyLevel(remainingSeconds(expiresAtUtc, now())) === 'expired') {
      fired = true
      onExpire()
    }
  }
  check()
  const id = setInterval(check, intervalMs)
  return {
    stop: () => clearInterval(id)
  }
}
