import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { Meter } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const segments = [1, 2, 3, 4, 5, 6, 7, 8].map((slot) => ({
  value: 1,
  label: `Slot ${slot}`
}))

describe('Meter under forced colours', () => {
  it('textures every segment with its own pattern', async (context) => {
    const { container } = render(
      <Meter label='Tickets by type' max={8} segments={segments} />
    )
    const patterns = () =>
      Array.from(
        container.querySelectorAll('[data-slot=meter-segment]'),
        (segment) => getComputedStyle(segment).backgroundImage
      )
    expect(new Set(patterns())).toEqual(new Set(['none']))

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      const forced = patterns()
      expect(forced).not.toContain('none')
      expect(new Set(forced).size).toBe(segments.length)
    } finally {
      await commands.forcedColors(false)
    }
  })
})
