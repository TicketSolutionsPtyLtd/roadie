import { describe, expect, it } from 'vitest'

import { buildCheckoutUrl, isSafeRelativePath } from './url'

describe('isSafeRelativePath', () => {
  it('accepts a single-slash same-origin path', () => {
    expect(isSafeRelativePath('/outlet/extras/abc')).toBe(true)
  })
  it.each([
    ['protocol-relative', '//evil.com/x'],
    ['http', 'http://evil.com'],
    ['https', 'https://evil.com'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,x'],
    ['empty', ''],
    ['no leading slash', 'outlet/extras'],
    ['backslash trick', '/\\evil.com'],
    ['whitespace scheme', ' javascript:alert(1)'],
    ['embedded tab', '/\t/evil.com'],
    ['embedded LF', '/\n/evil.com'],
    ['embedded CR', '/\r/evil.com']
  ])('rejects %s', (_label: string, input: string) => {
    expect(isSafeRelativePath(input)).toBe(false)
  })
  it.each([
    ['nested path', '/outlet/extras/abc'],
    ['query with slashes', '/path?x=//evil'],
    ['dot-segments resolve same-origin', '/../../etc/passwd'],
    ['percent-encoded slashes are literal', '/%2F%2Fevil.com']
  ])('still accepts %s (no over-rejection)', (_label: string, input: string) => {
    expect(isSafeRelativePath(input)).toBe(true)
  })
})

describe('buildCheckoutUrl', () => {
  it('concatenates host + valid path', () => {
    expect(buildCheckoutUrl('https://h.example', '/outlet/extras/abc')).toBe(
      'https://h.example/outlet/extras/abc'
    )
  })
  it('works same-origin (empty host)', () => {
    expect(buildCheckoutUrl('', '/outlet/extras/abc')).toBe(
      '/outlet/extras/abc'
    )
  })
  it('returns null for an unsafe extrasUrl', () => {
    expect(buildCheckoutUrl('https://h.example', 'https://evil.com')).toBeNull()
  })
  it('returns null for an embedded-tab open-redirect path', () => {
    expect(buildCheckoutUrl('', '/\t/evil.com')).toBeNull()
  })
})
