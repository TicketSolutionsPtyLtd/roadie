import { describe, expect, it } from 'vitest'

import { activeHref } from './sectionMemory'

describe('activeHref', () => {
  it('prefers a declared href', () => {
    expect(activeHref('/tokens/color', '/tokens/color-page')).toBe(
      '/tokens/color-page'
    )
  })

  it('refuses a value that is not a path', () => {
    expect(activeHref('tokens-color', undefined)).toBeUndefined()
  })
})
