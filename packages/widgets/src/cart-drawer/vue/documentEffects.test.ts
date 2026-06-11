import { afterEach, describe, expect, it } from 'vitest'

import { lockBodyScroll } from './documentEffects'

afterEach(() => {
  document.body.style.overflow = ''
})

describe('lockBodyScroll (Vue) — refcounted body scroll lock', () => {
  it('keeps the body locked until the last holder releases', () => {
    const release1 = lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    const release2 = lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    // First holder releases — a second holder is still active, so the body
    // MUST stay locked. (This is the composition the inlined save/restore broke.)
    release1()
    expect(document.body.style.overflow).toBe('hidden')

    // Last holder releases — now the body unlocks.
    release2()
    expect(document.body.style.overflow).toBe('')
  })

  it('restores the original overflow value, not a hardcoded empty string', () => {
    document.body.style.overflow = 'scroll'

    const release = lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')

    release()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('treats a repeated release as a no-op (idempotent)', () => {
    const release1 = lockBodyScroll()
    const release2 = lockBodyScroll()

    release1()
    release1() // double-release must not decrement the count twice
    expect(document.body.style.overflow).toBe('hidden')

    release2()
    expect(document.body.style.overflow).toBe('')
  })
})
