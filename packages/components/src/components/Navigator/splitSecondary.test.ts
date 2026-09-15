import { afterEach, describe, expect, it, vi } from 'vitest'

import { initialOf } from './splitSecondary'

describe('initialOf', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uppercases a dotless i to the ASCII I, not the Turkish İ', () => {
    // A Turkish host's default locale; the server's would give "I".
    vi.spyOn(String.prototype, 'toLocaleUpperCase').mockImplementation(
      function (this: string) {
        return this.replaceAll('i', 'İ').toUpperCase()
      }
    )
    expect(initialOf('istanbul')).toBe('I')
  })

  it('trims leading whitespace before taking the first character', () => {
    expect(initialOf('  Settings')).toBe('S')
  })

  it('returns an empty string for an empty label', () => {
    expect(initialOf('')).toBe('')
  })
})
