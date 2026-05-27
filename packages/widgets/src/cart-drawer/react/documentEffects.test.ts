import { afterEach, describe, expect, it } from 'vitest'

import {
  clearDrawerHeightVar,
  lockBodyScroll,
  setDrawerHeightVar
} from './documentEffects'

const VAR = '--cart-drawer-height'

afterEach(() => {
  document.body.style.overflow = ''
  document.documentElement.style.removeProperty(VAR)
})

describe('lockBodyScroll (refcounted)', () => {
  it('locks on first acquire and only unlocks when the last releases', () => {
    const releaseA = lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    const releaseB = lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    // One instance closing must not unlock while another still holds the lock.
    releaseA()
    expect(document.body.style.overflow).toBe('hidden')

    releaseB()
    expect(document.body.style.overflow).toBe('')
  })

  it('is idempotent — double-release does not corrupt the count', () => {
    const releaseA = lockBodyScroll()
    const releaseB = lockBodyScroll()
    releaseA()
    releaseA() // StrictMode double-invoke / accidental double cleanup
    // B still holds the lock, so it must remain locked.
    expect(document.body.style.overflow).toBe('hidden')
    releaseB()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('drawer height CSS var (per-instance registry)', () => {
  it('publishes the max live height and survives one instance unmounting', () => {
    const a = {}
    const b = {}
    setDrawerHeightVar(a, 100)
    expect(document.documentElement.style.getPropertyValue(VAR)).toBe('100px')

    setDrawerHeightVar(b, 160)
    expect(document.documentElement.style.getPropertyValue(VAR)).toBe('160px')

    // Unmounting B must recompute from the survivors, not wipe the var.
    clearDrawerHeightVar(b)
    expect(document.documentElement.style.getPropertyValue(VAR)).toBe('100px')

    clearDrawerHeightVar(a)
    expect(document.documentElement.style.getPropertyValue(VAR)).toBe('')
  })
})
