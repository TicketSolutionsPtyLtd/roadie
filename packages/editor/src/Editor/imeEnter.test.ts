import { describe, expect, it } from 'vitest'

import { isImeEnter } from './imeEnter'

describe('isImeEnter', () => {
  it.each([
    ['an Enter while composing', { key: 'Enter', isComposing: true }, true],
    // Safari's, sent after compositionend.
    ['an Enter marked by keyCode 229', { key: 'Enter', keyCode: 229 }, true],
    ['a plain Enter', { key: 'Enter' }, false],
    ['another key while composing', { key: 'a', isComposing: true }, false]
  ])('reads %s as an IME Enter: %s', (_, init, expected) => {
    expect(isImeEnter({ isComposing: false, keyCode: 13, ...init })).toBe(
      expected
    )
  })
})
