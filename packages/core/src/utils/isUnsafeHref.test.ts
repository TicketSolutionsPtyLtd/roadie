import { describe, expect, it } from 'vitest'

import { isUnsafeHref } from './index'

describe('isUnsafeHref', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'blob:https://x.test/uuid',
    'file:///etc/passwd',
    'JaVaScRiPt:alert(1)',
    'DATA:text/html,x',
    '  javascript:alert(1)',
    '\tjavascript:alert(1)',
    '\njavascript:alert(1)',
    '\r\n data:text/html,x'
  ])('flags %j as unsafe', (href) => {
    expect(isUnsafeHref(href)).toBe(true)
  })

  it.each([
    '',
    '/javascript-tutorial',
    'https://x.test/javascript:',
    'http://x.test/?next=data:x',
    '//x.test',
    'data-foo',
    './data:x',
    '/events/123',
    'events/123',
    '#section',
    '?q=javascript:',
    'mailto:hello@oztix.com.au',
    'tel:+61400000000',
    'sms:+61400000000'
  ])('lets %j through', (href) => {
    expect(isUnsafeHref(href)).toBe(false)
  })
})
