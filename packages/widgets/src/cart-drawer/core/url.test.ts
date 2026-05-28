import { describe, expect, it } from 'vitest'

import {
  buildBrowseHref,
  buildCheckoutUrl,
  isSafeImageUrl,
  isSafeRelativePath
} from './url'

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

describe('isSafeImageUrl', () => {
  it.each([
    ['https', 'https://cdn.example/img.jpg'],
    ['http', 'http://cdn.example/img.jpg']
  ])('accepts absolute %s url', (_label: string, input: string) => {
    expect(isSafeImageUrl(input)).toBe(true)
  })
  it.each([
    ['protocol-relative', '//attacker.example/pixel.gif'],
    ['data uri', 'data:image/gif;base64,R0lGOD'],
    ['javascript', 'javascript:alert(1)'],
    ['relative path', '/images/x.jpg'],
    ['bare host', 'cdn.example/x.jpg'],
    ['empty', ''],
    ['leading space', ' https://cdn.example/x.jpg'],
    ['embedded NUL', `https://cdn.example/${String.fromCharCode(0)}.jpg`]
  ])('rejects %s', (_label: string, input: string) => {
    expect(isSafeImageUrl(input)).toBe(false)
  })
  it('rejects null/undefined', () => {
    expect(isSafeImageUrl(null)).toBe(false)
    expect(isSafeImageUrl(undefined)).toBe(false)
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
    expect(buildCheckoutUrl('', withCtrl(0x09))).toBeNull()
  })
})

describe('buildBrowseHref', () => {
  // jsdom defaults: http://localhost/ — set explicit pathname/search per test.
  const setLocation = (pathname: string, search: string): void => {
    window.history.replaceState({}, '', `${pathname}${search}`)
  }
  const COLLECTION = 'abc-123-DEF'

  it('builds /collection/cart with id + redirect to current path+search', () => {
    setLocation('/event/x/y', '?foo=1&bar=2')
    expect(buildBrowseHref(COLLECTION)).toBe(
      `/collection/cart/?id=abc-123-DEF&redirect=${encodeURIComponent('/event/x/y?foo=1&bar=2')}`
    )
  })
  it('strips an existing `redirect` param from the current search', () => {
    setLocation('/event/x', '?redirect=%2Fstale&keep=1')
    expect(buildBrowseHref(COLLECTION)).toBe(
      `/collection/cart/?id=abc-123-DEF&redirect=${encodeURIComponent('/event/x?keep=1')}`
    )
  })
  it('omits an empty query string from the redirect', () => {
    setLocation('/event/x', '')
    expect(buildBrowseHref(COLLECTION)).toBe(
      `/collection/cart/?id=abc-123-DEF&redirect=${encodeURIComponent('/event/x')}`
    )
  })
  it('returns "/" when collectionId is empty', () => {
    setLocation('/event/x', '')
    expect(buildBrowseHref('')).toBe('/')
  })
  it('encodes collectionId so a hostile value cannot inject query params', () => {
    setLocation('/event/x', '')
    const href = buildBrowseHref('&inject=evil')
    expect(href).toContain('id=%26inject%3Devil')
    expect(href).not.toMatch(/[?&]inject=evil/)
  })
})
