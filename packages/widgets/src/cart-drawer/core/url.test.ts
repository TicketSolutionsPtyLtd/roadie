import { describe, expect, it } from 'vitest'

import { buildCheckoutUrl, isSafeRelativePath } from './url'

/** Build `/<ctrl>/evil.com` without putting literal control bytes in source. */
const withCtrl = (code: number): string =>
  `/${String.fromCharCode(code)}/evil.com`

describe('isSafeRelativePath', () => {
  it('accepts a single-slash same-origin path', () => {
    expect(isSafeRelativePath('/outlet/extras/abc')).toBe(true)
  })
  it.each([
    ['protocol-relative', '//evil.com/x'],
    ['http', 'http://evil.com'],
    ['https', 'https://evil.com'],
    ['uppercase http scheme', 'HTTP://evil.com'],
    ['mixed-case javascript scheme', 'JavaScript:alert(1)'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,x'],
    ['empty', ''],
    ['no leading slash', 'outlet/extras'],
    ['backslash trick', '/\\evil.com'],
    ['whitespace scheme', ' javascript:alert(1)'],
    ['embedded tab', withCtrl(0x09)],
    ['embedded LF', withCtrl(0x0a)],
    ['embedded CR', withCtrl(0x0d)],
    ['embedded NUL', withCtrl(0x00)],
    ['embedded vertical tab', withCtrl(0x0b)],
    ['embedded form feed', withCtrl(0x0c)],
    ['embedded DEL', withCtrl(0x7f)]
  ])('rejects %s', (_label: string, input: string) => {
    expect(isSafeRelativePath(input)).toBe(false)
  })
  it.each([
    ['nested path', '/outlet/extras/abc'],
    ['query with slashes', '/path?x=//evil'],
    ['dot-segments resolve same-origin', '/../../etc/passwd'],
    ['percent-encoded slashes are literal', '/%2F%2Fevil.com']
  ])(
    'still accepts %s (no over-rejection)',
    (_label: string, input: string) => {
      expect(isSafeRelativePath(input)).toBe(true)
    }
  )
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
    expect(buildCheckoutUrl('', withCtrl(0x09))).toBeNull()
  })
})
