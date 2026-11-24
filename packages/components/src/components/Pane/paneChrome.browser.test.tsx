import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { Pane } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from './testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await commands.reduceTransparency(false)
})

// A colour with no alpha component is opaque.
const alpha = (colour: string) =>
  Number(/\/\s*([\d.]+)\s*\)$/.exec(colour)?.[1] ?? 1)

function chrome() {
  const { container } = render(
    <div style={{ width: 600, height: 500, display: 'grid' }}>
      <Pane>
        <Pane.Header>
          <Pane.Title>Corduroy Lagoon Sessions</Pane.Title>
        </Pane.Header>
        <div style={{ height: 2000 }} />
        <Pane.Footer>Footer</Pane.Footer>
      </Pane>
    </div>
  )
  return (['pane-header', 'pane-footer'] as const).map((slot) => {
    const element = container.querySelector<HTMLElement>(
      `[data-slot="${slot}"]`
    )!
    return [slot, getComputedStyle(element)] as const
  })
}

describe('pane chrome', () => {
  it.runIf(CSS.supports('backdrop-filter', 'blur(0)'))(
    'blurs what scrolls under it through the translucent recipe',
    () => {
      for (const [slot, style] of chrome()) {
        expect(style.backdropFilter, slot).toBe('blur(12px)')
        expect(alpha(style.backgroundColor), slot).toBeCloseTo(0.85, 2)
      }
    }
  )

  it('goes solid for someone who reduces transparency', async ({ skip }) => {
    if (!(await commands.reduceTransparency(true)))
      skip('Only Chromium can emulate reduced transparency')
    for (const [slot, style] of chrome()) {
      expect(style.backdropFilter, slot).toBe('none')
      expect(alpha(style.backgroundColor), slot).toBe(1)
    }
  })
})
