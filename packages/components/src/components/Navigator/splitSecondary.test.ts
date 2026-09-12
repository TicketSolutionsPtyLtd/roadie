import { describe, expect, it } from 'vitest'

import { initialOf } from './splitSecondary'

describe('initialOf', () => {
  it("capitalises the label's first character", () => {
    expect(initialOf('installation')).toBe('I')
  })

  it('uppercases a dotless i to the ASCII I, not the Turkish İ', () => {
    expect(initialOf('istanbul')).toBe('I')
  })

  it('trims leading whitespace before taking the first character', () => {
    expect(initialOf('  Settings')).toBe('S')
  })

  it('returns an empty string for an empty label', () => {
    expect(initialOf('')).toBe('')
  })
})
