import { describe, expect, it } from 'vitest'

import { resolveLinkKind } from './resolveLinkKind'

describe('resolveLinkKind', () => {
  it('returns button for undefined', () => {
    expect(resolveLinkKind(undefined)).toBe('button')
  })

  it('returns external for https://', () => {
    expect(resolveLinkKind('https://example.com')).toBe('external')
  })

  it('returns external for http://', () => {
    expect(resolveLinkKind('http://example.com')).toBe('external')
  })

  it('returns external for protocol-relative //', () => {
    expect(resolveLinkKind('//example.com')).toBe('external')
  })

  it('returns protocol for mailto:', () => {
    expect(resolveLinkKind('mailto:hello@oztix.com.au')).toBe('protocol')
  })

  it('returns protocol for tel:', () => {
    expect(resolveLinkKind('tel:+61400000000')).toBe('protocol')
  })

  it('returns protocol for sms:', () => {
    expect(resolveLinkKind('sms:+61400000000')).toBe('protocol')
  })

  it('returns internal for absolute path', () => {
    expect(resolveLinkKind('/events/123')).toBe('internal')
  })

  it('returns internal for relative path', () => {
    expect(resolveLinkKind('./local')).toBe('internal')
  })

  it('returns internal for empty string (caller responsibility)', () => {
    expect(resolveLinkKind('')).toBe('internal')
  })

  it('returns internal for hash fragment', () => {
    expect(resolveLinkKind('#section')).toBe('internal')
  })

  it('matches external case-insensitively', () => {
    expect(resolveLinkKind('HTTPS://example.com')).toBe('external')
    expect(resolveLinkKind('Http://example.com')).toBe('external')
  })

  it('matches protocol case-insensitively', () => {
    expect(resolveLinkKind('MAILTO:a@b.com')).toBe('protocol')
    expect(resolveLinkKind('Tel:+61400000000')).toBe('protocol')
  })
})
