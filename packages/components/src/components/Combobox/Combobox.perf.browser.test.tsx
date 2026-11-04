import { describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Combobox } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, typeEvery, venues } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

describe('Combobox filters at 60fps on a slowed CPU', () => {
  it('filters 2,000 venues as someone types', async () => {
    const root = await mount(
      <EventPage>
        <Combobox items={venues(2000)}>
          <Combobox.InputGroup>
            <Combobox.Input aria-label='Venue' />
            <Combobox.Trigger />
          </Combobox.InputGroup>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  {(venue: string) => (
                    <Combobox.Item key={venue} value={venue}>
                      {venue}
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox>
      </EventPage>,
      { frames: 5 }
    )
    const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!
    // A page without window focus fires no focus events, so the popup stays shut.
    await commands.focusPage()
    await expectFrameBudget(
      'Combobox, typing over 2,000 items',
      await measureFrames(typeEvery(input, 'gumleaf hall 1'), { frames: 100 })
    )
    await expect
      .poll(() => document.querySelectorAll('[role="option"]').length)
      .toBeGreaterThan(0)
  })
})
