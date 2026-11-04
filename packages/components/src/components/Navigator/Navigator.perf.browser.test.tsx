import { useEffect, useState } from 'react'

import { afterAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage } from '../../utils/frameTestUtils'
import { Pane } from '../Pane'
import { forgetPaneScroll } from '../Pane/paneScroll'
import { withStubLink } from './testUtils'

setupFrameTests({ css: roadieCss })
afterAll(async () => {
  forgetPaneScroll()
  await page.viewport(1440, 900)
})

let go: (value: string) => void = () => {}

const SHOWS = Array.from({ length: 6 }, (_, index) => `/shows/${index + 1}`)

function Promoter() {
  const [value, setValue] = useState('/shows')
  useEffect(() => {
    go = setValue
  }, [])
  return withStubLink(
    <div style={{ height: '100vh', display: 'grid' }}>
      <Navigator value={value} onValueChange={setValue}>
        <Navigator.Primary aria-label='Promoter'>
          <Navigator.Item value='/shows' href='/shows'>
            Shows
            <Navigator.Secondary aria-label='Shows' overview>
              {SHOWS.map((show, index) => (
                <Navigator.Item key={show} value={show} href={show}>
                  The Rolling Kazoos, night {index + 1}
                </Navigator.Item>
              ))}
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='/orders' href='/orders'>
            Orders
          </Navigator.Item>
        </Navigator.Primary>
        <Pane>
          <Pane.Header>
            <Pane.Title>{value}</Pane.Title>
          </Pane.Header>
          <EventPage />
        </Pane>
      </Navigator>
    </div>
  )
}

describe('Navigator steps between pages at 60fps on a slowed CPU', () => {
  it.each([
    ['phone', 390],
    ['desktop', 1440]
  ] as const)('steps into a show and back on a %s', async (name, width) => {
    await page.viewport(width, 844)
    await mount(<Promoter />, { frames: 10 })
    for (const [scenario, value] of [
      ['into a show', '/shows/1'],
      ['back to shows', '/shows']
    ] as const)
      await expectFrameBudget(
        `Navigator, ${name}, ${scenario}`,
        await measureFrames((index) => index === 0 && go(value), {
          frames: 60
        }),
        // The phone steps pages; the desktop shows them side by side.
        name === 'phone' && value !== '/shows' ? { knownMiss: 'INNO-1524' } : {}
      )
    expect(document.querySelector('[data-slot="pane"]')).not.toBeNull()
  })
})
