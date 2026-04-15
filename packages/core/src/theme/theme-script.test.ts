import { describe, expect, it } from 'vitest'

import { getBootstrapScript, getThemeScript } from './index'

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

describe('getBootstrapScript', () => {
  it('wraps getThemeScript in a <script> tag when no accent is provided', () => {
    const output = getBootstrapScript()
    expect(output).toMatch(/^<script>try\{/)
    expect(output).toMatch(/<\/script>$/)
    expect(output).not.toContain('--accent-hue')
  })

  it('passes theme options through to getThemeScript', () => {
    const output = getBootstrapScript({ followSystem: true })
    expect(output).toContain('matchMedia')
  })

  it('appends an accent style tag when accentColor is provided', () => {
    const output = getBootstrapScript({ accentColor: '#0091EB' })
    expect(output).toContain('<script>')
    expect(output).toContain('</script>')
    expect(output).toContain(
      '<style id="roadie-accent-theme">:root{--accent-hue:'
    )
    expect(output).toContain('--accent-chroma:')
    expect(output).toContain('</style>')
  })

  it('treats null accentColor as no accent', () => {
    const output = getBootstrapScript({ accentColor: null })
    expect(output).not.toContain('--accent-hue')
  })

  it('treats undefined accentColor as no accent', () => {
    const output = getBootstrapScript({ accentColor: undefined })
    expect(output).not.toContain('--accent-hue')
  })

  it('throws on invalid hex accentColor', () => {
    expect(() => getBootstrapScript({ accentColor: 'garbage' })).toThrow(
      /Invalid accentColor/
    )
  })

  it('produces an integer hue value', () => {
    const output = getBootstrapScript({ accentColor: '#0091EB' })
    // Hue should be rounded to a whole number
    const match = output.match(/--accent-hue:(-?\d+)/)
    expect(match).not.toBeNull()
    expect(Number.isInteger(Number(match![1]))).toBe(true)
  })

  it('produces a 4-decimal chroma value', () => {
    const output = getBootstrapScript({ accentColor: '#0091EB' })
    const match = output.match(/--accent-chroma:([\d.]+)/)
    expect(match).not.toBeNull()
    const decimals = match![1]!.split('.')[1] ?? ''
    expect(decimals.length).toBeLessThanOrEqual(4)
  })
})
