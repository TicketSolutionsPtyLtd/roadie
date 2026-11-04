import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import {
  expectFrameBudget,
  measureWhile,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Combobox } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { EventPage, venues } from '../../utils/frameTestUtils'

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
    await userEvent.click(input)
    // Real keys: in CI a value set from script left the popup shut.
    await expectFrameBudget(
      'Combobox, typing over 2,000 items',
      await measureWhile(() => userEvent.keyboard('gumleaf hall 1')),
      { knownMiss: 'INNO-1524' }
    )
    expect(input.value).toBe('gumleaf hall 1')
    await expect
      .poll(() => document.querySelectorAll('[role="option"]').length)
      .toBeGreaterThan(0)
  })
})
