// Module-level coordination for the global body-scroll lock. The cart drawer
// and the expiry modals can be open at the same time (the warning modal appears
// while the drawer is still mounted, in either docked or open state), and both
// need to lock background scroll. Managing `document.body.style.overflow`
// independently from each component does NOT compose: a save/restore in one and
// a set/clear in the other means whichever unmounts last wins, re-enabling
// background scroll while the other is still open (or stranding a lock with
// nothing open). Refcount it so the body stays locked while ANY holder is
// active and the original value is restored only when the last one releases.
// Mirrors the React skin's `documentEffects.lockBodyScroll`.

let scrollLockCount = 0
let prevOverflow = ''

/**
 * Acquire the body scroll lock. Returns a release fn (idempotent — safe to call
 * more than once). The body unlocks, restoring its prior overflow, only when the
 * last holder releases.
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (scrollLockCount === 0) {
    prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLockCount++
  let released = false
  return () => {
    if (released) return
    released = true
    scrollLockCount--
    if (scrollLockCount === 0) {
      document.body.style.overflow = prevOverflow
    }
  }
}
