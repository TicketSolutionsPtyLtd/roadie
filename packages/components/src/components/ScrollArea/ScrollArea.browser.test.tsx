import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { ScrollArea } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { focusAfterKey, focusRing, plainLinkRing } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(
    `${roadieCss}\n* { transition: none !important }`
  )
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('ScrollArea', () => {
  it('draws the base focus ring inside its viewport', async () => {
    const expected = await plainLinkRing()
    const { container } = render(
      <ScrollArea style={{ height: 80 }}>
        <ScrollArea.Viewport tabIndex={0}>
          <p style={{ height: 400 }}>Lineup for The Corner Hotel</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot=scroll-area-viewport]'
    )!

    await focusAfterKey(viewport)

    expect(focusRing(viewport)).toEqual({ ...expected, offset: '-4px' })
  })
})
