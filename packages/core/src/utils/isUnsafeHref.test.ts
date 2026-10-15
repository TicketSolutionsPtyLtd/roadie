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
    '\r\n data:text/html,x',
    'java\tscript:alert(1)',
    'jav\nascript:alert(1)',
    'java\rscript:alert(1)',
    'data\t:text/html,x',
    '\x00javascript:alert(1)',
    '\u0001data:text/html,x',
    '\x1f \tvbscript:msgbox(1)',
    '\u00a0javascript:alert(1)'
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
    'sms:+61400000000',
    '/path\twith\ttab',
    '/java\nscript:alert(1)',
    'https://x.test/\tdata:x'
  ])('lets %j through', (href) => {
    expect(isUnsafeHref(href)).toBe(false)
  })
})
