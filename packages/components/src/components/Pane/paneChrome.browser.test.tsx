import type { CSSProperties } from 'react'

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
  document.documentElement.classList.remove('dark')
  await commands.reduceTransparency(false)
})

const canBlur = CSS.supports('backdrop-filter', 'blur(0)')

// A sunken surface, as Navigator publishes, so the chrome must tint from
// --pane-surface rather than the recipe's raised fallback.
const SURFACE = { '--pane-surface': 'var(--intent-bg-sunken)' } as CSSProperties

function chrome(fill: string) {
  const { container, getByTestId } = render(
    <div style={{ width: 600, height: 500, display: 'grid', ...SURFACE }}>
      <div
        data-testid='expected'
        style={{
          backgroundColor: `color-mix(in oklch, var(--intent-bg-sunken) ${fill}, transparent)`
        }}
      />
      <Pane emphasis='subtle'>
        <Pane.Header>
          <Pane.Title>Corduroy Lagoon Sessions</Pane.Title>
        </Pane.Header>
        <div style={{ height: 2000 }} />
        <Pane.Footer>Footer</Pane.Footer>
      </Pane>
    </div>
  )
  const expected = getComputedStyle(getByTestId('expected')).backgroundColor
  const parts = (['pane-header', 'pane-footer'] as const).map((slot) => {
    const element = container.querySelector<HTMLElement>(
      `[data-slot="${slot}"]`
    )!
    return [slot, getComputedStyle(element)] as const
  })
  return { expected, parts }
}

describe('pane chrome', () => {
  it.runIf(canBlur).each([
    ['light', '85%'],
    ['dark', '88%']
  ] as const)(
    'blurs what scrolls under it through the translucent recipe, over its own surface (%s)',
    (mode, fill) => {
      if (mode === 'dark') document.documentElement.classList.add('dark')
      const { expected, parts } = chrome(fill)
      for (const [slot, style] of parts) {
        expect(style.backdropFilter, slot).toBe('blur(12px)')
        expect(style.backgroundColor, slot).toBe(expected)
      }
    }
  )

  it('goes solid for someone who reduces transparency', async ({ skip }) => {
    if (!(await commands.reduceTransparency(true)))
      skip('Only Chromium can emulate reduced transparency')
    const { expected, parts } = chrome('100%')
    for (const [slot, style] of parts) {
      expect(style.backdropFilter, slot).toBe('none')
      expect(style.backgroundColor, slot).toBe(expected)
    }
  })
})
