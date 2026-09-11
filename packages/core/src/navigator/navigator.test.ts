import { describe, expect, it } from 'vitest'

import { NAVIGATOR_EXPANDED_SCOPE } from './index'

describe('NAVIGATOR_EXPANDED_SCOPE', () => {
  it('is scoped to the vertical navigation, by its own state or the document', () => {
    expect(NAVIGATOR_EXPANDED_SCOPE).toBe(
      '[data-slot=navigator-primary][data-orientation=vertical][data-expanded], [data-slot=navigator-primary][data-orientation=vertical][data-expanded] *, [data-navigator-expanded] [data-slot=navigator-primary][data-orientation=vertical][data-from-document], [data-navigator-expanded] [data-slot=navigator-primary][data-orientation=vertical][data-from-document] *'
    )
  })
})
