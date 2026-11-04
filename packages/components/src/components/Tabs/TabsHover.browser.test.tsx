import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { Tabs, type TabsRootEmphasis } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Button } from '../Button'
import { useStylesheet } from '../Pane/testUtils'
import { hoverFill, settledStylesheet } from '../Toggle/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(await settledStylesheet(commands, roadieCss))
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const EMPHASES: TabsRootEmphasis[] = ['strong', 'normal', 'subtle', 'subtler']

function renderTabs(
  emphasis: TabsRootEmphasis,
  direction: 'horizontal' | 'vertical' = 'horizontal'
) {
  render(
    <Tabs emphasis={emphasis} direction={direction} defaultValue='lineup'>
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
    'fills an inactive tab as a subtler button at %s emphasis',
    async (emphasis) => {
      render(<Button emphasis='subtler'>Tickets</Button>)
      const button = await hoverFill(
        screen.getByRole('button', { name: 'Tickets' })
      )
      const tab = await hoverFill(renderTabs(emphasis))

      expect(tab.rest).toBe(button.rest)
      expect(tab.hovered).toBe(button.hovered)
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

  it('rounds a subtler tab only away from its underline', () => {
    const corners = (tab: HTMLElement) => {
      const style = getComputedStyle(tab)
      return {
        topLeft: style.borderTopLeftRadius,
        topRight: style.borderTopRightRadius,
        bottomRight: style.borderBottomRightRadius,
        bottomLeft: style.borderBottomLeftRadius
      }
    }

    const across = corners(renderTabs('subtler'))
    expect(across.bottomLeft).toBe('0px')
    expect(across.bottomRight).toBe('0px')
    expect(across.topLeft).not.toBe('0px')
    expect(across.topRight).not.toBe('0px')
    cleanup()

    const down = corners(renderTabs('subtler', 'vertical'))
    expect(down.topLeft).toBe('0px')
    expect(down.bottomLeft).toBe('0px')
    expect(down.topRight).not.toBe('0px')
    expect(down.bottomRight).not.toBe('0px')
  })

  it.each(['horizontal', 'vertical'] as const)(
    'keeps an icon-only subtler tab a circle in a %s list',
    (direction) => {
      render(
        <Tabs emphasis='subtler' direction={direction} defaultValue='chart'>
          <Tabs.List>
            <Tabs.Tab value='chart'>Chart</Tabs.Tab>
            <Tabs.Tab value='table' aria-label='Table'>
              <svg className='size-4' viewBox='0 0 16 16' />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      )
      const tab = screen.getByRole('tab', { name: 'Table' })
      const style = getComputedStyle(tab)
      const half = tab.getBoundingClientRect().height / 2

      for (const corner of [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius
      ]) {
        expect(parseFloat(corner)).toBeGreaterThanOrEqual(half)
      }
    }
  )

  it.each(EMPHASES)('sets tabs side by side at %s emphasis', (emphasis) => {
    const venue = renderTabs(emphasis)
    const lineup = screen.getByRole('tab', { name: 'Lineup' })

    expect(venue.getBoundingClientRect().left).toBe(
      lineup.getBoundingClientRect().right
    )
  })
})
