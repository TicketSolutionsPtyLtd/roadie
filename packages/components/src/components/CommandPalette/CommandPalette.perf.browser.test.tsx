import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import {
  expectFrameBudget,
  measureWhile,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { CommandPalette } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { BACKDROP_BLUR, EventPage, venues } from '../../utils/frameTestUtils'

setupFrameTests({ css: roadieCss })

describe('CommandPalette ranks at 60fps on a slowed CPU', () => {
  it('ranks 200 venues as someone types', async () => {
    const root = await mount(
      <EventPage>
        <CommandPalette defaultOpen items={venues(200)}>
          <CommandPalette.Input />
          <CommandPalette.List>
            {(venue: string) => (
              <CommandPalette.Item key={venue} value={venue}>
                {venue}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
        </CommandPalette>
      </EventPage>,
      { frames: 5 }
    )
    const input =
      root.ownerDocument.querySelector<HTMLInputElement>('[role="combobox"]')!
    await expect.poll(() => document.activeElement).toBe(input)
    await expectFrameBudget(
      'CommandPalette, typing over 200 items',
      await measureWhile(() => userEvent.keyboard('gumleaf hall 1')),
      // The palette is a Dialog, so typing pays its full-page blur each frame.
      { exception: BACKDROP_BLUR }
    )
    expect(input.value).toBe('gumleaf hall 1')
    await expect
      .poll(() => document.querySelectorAll('[role="option"]').length)
      .toBeGreaterThan(0)
  })

  it('filters 2,000 venues in a virtualized list as someone types', async () => {
    const root = await mount(
      <EventPage>
        <CommandPalette defaultOpen items={venues(2000)} virtualized>
          <CommandPalette.Input />
          <CommandPalette.List>
            {(venue: string) => (
              <CommandPalette.Item key={venue} value={venue}>
                {venue}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
        </CommandPalette>
      </EventPage>,
      { frames: 5 }
    )
    const input =
      root.ownerDocument.querySelector<HTMLInputElement>('[role="combobox"]')!
    await expect.poll(() => document.activeElement).toBe(input)
    await expectFrameBudget(
      'CommandPalette, typing over 2,000 items, virtualized',
      await measureWhile(() => userEvent.keyboard('gumleaf hall 1')),
      { exception: BACKDROP_BLUR }
    )
    expect(input.value).toBe('gumleaf hall 1')
    await expect
      .poll(() => document.querySelectorAll('[role="option"]').length)
      .toBeGreaterThan(0)
  })
})
