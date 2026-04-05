import { describe, expect, it } from 'vitest'

import { getThemeScript } from './index'

describe('getThemeScript', () => {
  it('returns a string', () => {
    expect(typeof getThemeScript()).toBe('string')
  })

  it('defaults to light mode', () => {
    const script = getThemeScript()
    expect(script).toContain("'light'")
    expect(script).not.toContain('matchMedia')
  })

  it('defaults to dark when defaultDark is true', () => {
    const script = getThemeScript({ defaultDark: true })
    expect(script).toContain("'dark'")
  })

  it('uses matchMedia when followSystem is true', () => {
    const script = getThemeScript({ followSystem: true })
    expect(script).toContain('matchMedia')
    expect(script).toContain('prefers-color-scheme:dark')
  })

  it('does not use matchMedia when followSystem is false', () => {
    const script = getThemeScript({ followSystem: false })
    expect(script).not.toContain('matchMedia')
  })

  it('reads from localStorage', () => {
    const script = getThemeScript()
    expect(script).toContain('localStorage')
    expect(script).toContain("getItem('theme')")
  })

  it('toggles the dark class on documentElement', () => {
    const script = getThemeScript()
    expect(script).toContain("classList.toggle('dark'")
  })

  it('sets color-scheme style on documentElement', () => {
    const script = getThemeScript()
    expect(script).toContain('colorScheme')
  })

  it('wraps in try/catch for safety', () => {
    const script = getThemeScript()
    expect(script).toMatch(/^try\{/)
    expect(script).toMatch(/catch\(e\)\{\}$/)
  })

  it('followSystem takes precedence over defaultDark', () => {
    const script = getThemeScript({ followSystem: true, defaultDark: true })
    // When followSystem is true, it should use matchMedia, not the defaultDark value
    expect(script).toContain('matchMedia')
  })
})
