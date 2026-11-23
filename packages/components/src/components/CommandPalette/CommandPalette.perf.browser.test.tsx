import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import {
  expectFrameBudget,
  measureFrames,
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

  describe('with 2,000 venues in groups, virtualized', () => {
    const all = venues(2000)
    const groups = [
      { label: 'Halls', items: all.slice(0, 700) },
      { label: 'Rooms', items: all.slice(700, 1400) },
      { label: 'Teacups', items: all.slice(1400) }
    ]

    async function mountGrouped() {
      const root = await mount(
        <EventPage>
          <CommandPalette defaultOpen items={groups} virtualized>
            <CommandPalette.Input />
            <CommandPalette.List>
              {(group: (typeof groups)[number]) => (
                <CommandPalette.Group key={group.label} items={group.items}>
                  <CommandPalette.GroupLabel>
                    {group.label}
                  </CommandPalette.GroupLabel>
                  <CommandPalette.Collection>
                    {(venue: string) => (
                      <CommandPalette.Item key={venue} value={venue}>
                        {venue}
                      </CommandPalette.Item>
                    )}
                  </CommandPalette.Collection>
                </CommandPalette.Group>
              )}
            </CommandPalette.List>
          </CommandPalette>
        </EventPage>,
        { frames: 5 }
      )
      const input =
        root.ownerDocument.querySelector<HTMLInputElement>('[role="combobox"]')!
      await expect.poll(() => document.activeElement).toBe(input)
      return input
    }

    it('filters them as someone types', async () => {
      const input = await mountGrouped()
      await expectFrameBudget(
        'CommandPalette, typing over 2,000 grouped items, virtualized',
        await measureWhile(() => userEvent.keyboard('gumleaf hall 1')),
        { exception: BACKDROP_BLUR }
      )
      expect(input.value).toBe('gumleaf hall 1')
      await expect
        .poll(() => document.querySelectorAll('[role="option"]').length)
        .toBeGreaterThan(0)
    })

    it('scrolls through them, past group labels', async () => {
      await mountGrouped()
      const list = document.querySelector<HTMLElement>('[role="listbox"]')!
      await expectFrameBudget(
        'CommandPalette, scrolling 2,000 grouped items, virtualized',
        await measureFrames(() => {
          list.scrollTop += 300
        }),
        { exception: BACKDROP_BLUR }
      )
      expect(document.querySelectorAll('[role="option"]').length).toBeLessThan(
        80
      )
    })
  })
})
