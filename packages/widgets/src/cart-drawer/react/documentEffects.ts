'use client'

// Module-level coordination for the two global document side effects the
// CartDrawer needs. Multiple drawer instances on a page (responsive variants,
// StrictMode double-mount, hot reload) would otherwise corrupt each other:
// one instance's cleanup would unlock body scroll while another is still modal,
// or remove the height CSS var another instance still owns. Refcount the scroll
// lock; track heights per instance and publish the max live value.

const CART_HEIGHT_VAR = '--cart-drawer-height'

let scrollLockCount = 0
let prevOverflow = ''

/**
 * Acquire the body scroll lock. Returns a release fn (idempotent — safe to call
 * more than once). The body unlocks only when the last holder releases.
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

const heights = new Map<object, number>()

function applyMaxHeight(): void {
  if (typeof document === 'undefined') return
  if (heights.size === 0) {
    document.documentElement.style.removeProperty(CART_HEIGHT_VAR)
    return
  }
  const max = Math.max(...heights.values())
  document.documentElement.style.setProperty(CART_HEIGHT_VAR, `${max}px`)
}

/** Register/refresh this instance's docked height; republishes the max. */
export function setDrawerHeightVar(key: object, px: number): void {
  heights.set(key, px)
  applyMaxHeight()
}

/** Deregister this instance; republishes the max of the survivors (or clears). */
export function clearDrawerHeightVar(key: object): void {
  heights.delete(key)
  applyMaxHeight()
}
