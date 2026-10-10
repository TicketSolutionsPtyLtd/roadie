import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { DEFAULT_ACCENT_COLOR } from './index'

describe('DEFAULT_ACCENT_COLOR', () => {
  it('is the accent step 9 that tokens.css ships', () => {
    const tokens = readFileSync(
      new URL('../css/tokens.css', import.meta.url),
      'utf8'
    )
    expect(tokens).toContain(`--color-accent-light-9: ${DEFAULT_ACCENT_COLOR};`)
  })
})
