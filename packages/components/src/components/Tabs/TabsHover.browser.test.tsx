import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { Tabs, type TabsRootEmphasis } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { hoverFill, settledStylesheet } from '../Toggle/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(await settledStylesheet(commands, roadieCss))
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const EMPHASES: TabsRootEmphasis[] = ['strong', 'normal', 'subtle', 'subtler']

function renderTabs(emphasis: TabsRootEmphasis) {
  render(
    <Tabs emphasis={emphasis} defaultValue='lineup'>
      <Tabs.List>
        <Tabs.Tab value='lineup'>Lineup</Tabs.Tab>
        <Tabs.Tab value='venue'>Venue</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  )
  return screen.getByRole('tab', { name: 'Venue' })
}

describe('Tabs hover', () => {
  it.each(EMPHASES)(
    'fills an inactive tab at %s emphasis',
    async (emphasis) => {
      const { rest, hovered } = await hoverFill(renderTabs(emphasis))

      expect(hovered).not.toBe(rest)
    }
  )

  it.each(EMPHASES)(
    'keeps a tab’s size as it is chosen at %s emphasis',
    async (emphasis) => {
      const venue = renderTabs(emphasis)
      const before = venue.getBoundingClientRect().width

      venue.click()

      await expect.element(venue).toHaveAttribute('aria-selected', 'true')
      expect(venue.getBoundingClientRect().width).toBe(before)
    }
  )
})
