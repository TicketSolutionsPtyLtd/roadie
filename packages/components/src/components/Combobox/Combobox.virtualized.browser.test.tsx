import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Combobox } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { venues } from '../../utils/frameTestUtils'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(cleanup)

const VENUES = venues(2000)
const LAST = VENUES[VENUES.length - 1]

function Venues({ defaultValue }: { defaultValue?: string }) {
  return (
    <Combobox items={VENUES} virtualized defaultValue={defaultValue}>
      <Combobox.InputGroup>
        <Combobox.Input aria-label='Venue' />
        <Combobox.Trigger />
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup className='max-h-80'>
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
  )
}

const options = () => screen.queryAllByRole('option')
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/**
 * Waits for `row` to scroll out of the window and unmount, or `list` to snap
 * back to its top, then a few frames for the list to settle.
 */
async function settleOnceGone(row: HTMLElement, list: HTMLElement) {
  await expect.poll(() => !row.isConnected || list.scrollTop < 1500).toBe(true)
  for (let count = 0; count < 5; count++) await frame()
}
const active = () => {
  const id = screen.getByRole('combobox').getAttribute('aria-activedescendant')
  return id ? document.getElementById(id) : null
}

describe('Combobox virtualized', () => {
  it('mounts a window of rows, not all 2,000', async () => {
    render(<Venues />)
    await userEvent.click(screen.getByRole('combobox'))
    await expect.poll(() => options().length).toBeGreaterThan(0)
    expect(options().length).toBeLessThan(60)
  })

  it('gives each row its place in the whole list', async () => {
    render(<Venues />)
    await userEvent.click(screen.getByRole('combobox'))
    await expect.poll(() => options().length).toBeGreaterThan(0)
    const [first] = options()
    expect(first).toHaveAttribute('aria-posinset', '1')
    expect(first).toHaveAttribute('aria-setsize', '2000')
  })

  it('wraps up to the last venue and scrolls it into view', async () => {
    render(<Venues />)
    await userEvent.click(screen.getByRole('combobox'))
    await expect.poll(() => options().length).toBeGreaterThan(0)
    await userEvent.keyboard('{ArrowUp}')
    await expect.poll(() => active()?.textContent).toBe(LAST)
    const popup = document.querySelector('[data-slot="combobox-popup"]')!
    const row = active()!.getBoundingClientRect()
    const box = popup.getBoundingClientRect()
    expect(row.bottom).toBeLessThanOrEqual(box.bottom + 1)
    expect(row.top).toBeGreaterThanOrEqual(box.top - 1)
  })

  it('windows the matches as someone types', async () => {
    render(<Venues />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.keyboard('1')
    await expect
      .poll(() => options()[0]?.getAttribute('aria-setsize'))
      .not.toBe('2000')
    expect(options().length).toBeLessThan(60)
  })

  it('stays where it is scrolled with the pointer resting on a match', async () => {
    render(<Venues />)
    await userEvent.click(screen.getByRole('combobox'))
    // Typing turns on highlighting the first match, which once snapped the list back.
    await userEvent.keyboard('1')
    await expect.poll(() => active()?.textContent).toBe(VENUES[0])
    const popup = document.querySelector<HTMLElement>(
      '[data-slot="combobox-popup"]'
    )!
    const scroller = [popup, ...popup.querySelectorAll<HTMLElement>('*')].find(
      (element) => element.scrollHeight > element.clientHeight + 1
    )!
    const hovered = options()[2]!
    await userEvent.hover(hovered)
    scroller.scrollTop = 2000
    await settleOnceGone(hovered, scroller)
    // Measuring the rows drawn may nudge it, never back to the top.
    expect(scroller.scrollTop).toBeGreaterThan(1500)
    // Typing more still brings the first match into view.
    await userEvent.keyboard('0')
    await expect.poll(() => active()?.textContent).toBe(VENUES[9])
    const row = active()!.getBoundingClientRect()
    const box = scroller.getBoundingClientRect()
    expect(row.top).toBeGreaterThanOrEqual(box.top - 1)
    expect(row.bottom).toBeLessThanOrEqual(box.bottom + 1)
  })

  it('picks a venue below the first window', async () => {
    render(<Venues />)
    const input = screen.getByRole<HTMLInputElement>('combobox')
    await userEvent.click(input)
    await expect.poll(() => options().length).toBeGreaterThan(0)
    await userEvent.keyboard('{ArrowUp}')
    await expect.poll(() => active()?.textContent).toBe(LAST)
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => input.value).toBe(LAST)
  })

  it('reopens on the chosen venue after the pointer left the list', async () => {
    render(<Venues defaultValue={VENUES[1500]} />)
    const trigger = document.querySelector<HTMLElement>(
      '[data-slot="combobox-trigger"]'
    )!
    await userEvent.click(trigger)
    await screen.findByRole('option', { name: VENUES[1500] })
    await userEvent.hover(options()[0]!)
    await userEvent.hover(screen.getByRole('combobox'))
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => options().length).toBe(0)
    await userEvent.click(trigger)
    const chosen = await screen.findByRole('option', { name: VENUES[1500] })
    const popup = document.querySelector('[data-slot="combobox-popup"]')!
    const row = chosen.getBoundingClientRect()
    const box = popup.getBoundingClientRect()
    expect(row.top).toBeGreaterThanOrEqual(box.top - 1)
    expect(row.bottom).toBeLessThanOrEqual(box.bottom + 1)
  })

  // Untyped, nothing re-highlights after the pointer, so this guards against
  // a hover alone scrolling the list.
  it('stays where it is scrolled with the pointer resting on a venue', async () => {
    render(<Venues />)
    await userEvent.click(screen.getByRole('combobox'))
    await expect.poll(() => options().length).toBeGreaterThan(0)
    const popup = document.querySelector<HTMLElement>(
      '[data-slot="combobox-popup"]'
    )!
    const scroller = [popup, ...popup.querySelectorAll<HTMLElement>('*')].find(
      (element) => element.scrollHeight > element.clientHeight + 1
    )!
    const hovered = options()[2]!
    await userEvent.hover(hovered)
    scroller.scrollTop = 2000
    await settleOnceGone(hovered, scroller)
    expect(scroller.scrollTop).toBeGreaterThan(1500)
  })

  it('stays where it is scrolled after a second keystroke keeps the first match', async () => {
    render(<Venues />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.keyboard('K')
    await expect.poll(() => active()?.textContent).toBe(VENUES[0])
    // The first match doesn't change, so no new highlight follows the keystroke.
    await userEvent.keyboard('a')
    await expect.poll(() => active()?.textContent).toBe(VENUES[0])
    const popup = document.querySelector<HTMLElement>(
      '[data-slot="combobox-popup"]'
    )!
    const scroller = [popup, ...popup.querySelectorAll<HTMLElement>('*')].find(
      (element) => element.scrollHeight > element.clientHeight + 1
    )!
    const hovered = options()[2]!
    await userEvent.hover(hovered)
    scroller.scrollTop = 2000
    await settleOnceGone(hovered, scroller)
    expect(scroller.scrollTop).toBeGreaterThan(1500)
  })

  it('opens on the chosen venue when it sits below the first window', async () => {
    render(<Venues defaultValue={VENUES[1500]} />)
    await userEvent.click(
      document.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!
    )
    const chosen = await screen.findByRole('option', { name: VENUES[1500] })
    const popup = document.querySelector('[data-slot="combobox-popup"]')!
    const row = chosen.getBoundingClientRect()
    const box = popup.getBoundingClientRect()
    expect(row.top).toBeGreaterThanOrEqual(box.top - 1)
    expect(row.bottom).toBeLessThanOrEqual(box.bottom + 1)
  })

  describe('with groups', () => {
    const GROUPS = [
      { label: 'Halls', items: VENUES.slice(0, 700) },
      { label: 'Rooms', items: VENUES.slice(700, 1400) },
      { label: 'Teacups', items: VENUES.slice(1400) }
    ]

    function GroupedVenues({
      defaultValue,
      groupRef
    }: {
      defaultValue?: string
      groupRef?: (element: HTMLDivElement | null) => void
    }) {
      return (
        <Combobox items={GROUPS} virtualized defaultValue={defaultValue}>
          <Combobox.InputGroup>
            <Combobox.Input aria-label='Venue' />
            <Combobox.Trigger />
          </Combobox.InputGroup>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup className='max-h-80'>
                <Combobox.List>
                  {(group: (typeof GROUPS)[number]) => (
                    <Combobox.Group
                      key={group.label}
                      items={group.items}
                      ref={groupRef}
                    >
                      <Combobox.GroupLabel>{group.label}</Combobox.GroupLabel>
                      <Combobox.Collection>
                        {(venue: string, index: number) => (
                          <Combobox.Item
                            key={venue}
                            value={venue}
                            data-place={index}
                          >
                            {venue}
                          </Combobox.Item>
                        )}
                      </Combobox.Collection>
                    </Combobox.Group>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox>
      )
    }

    it('passes its own ref to each windowed group', async () => {
      const groups = new Set<HTMLDivElement>()
      render(
        <GroupedVenues
          groupRef={(element) => void (element && groups.add(element))}
        />
      )
      await userEvent.click(screen.getByRole('combobox'))
      await expect.poll(() => options().length).toBeGreaterThan(0)
      expect(groups).toContain(screen.getByRole('group', { name: 'Halls' }))
    })

    it('mounts a window of rows, each counted within its group', async () => {
      render(<GroupedVenues />)
      await userEvent.click(screen.getByRole('combobox'))
      await expect.poll(() => options().length).toBeGreaterThan(0)
      expect(options().length).toBeLessThan(60)
      expect(options()[0]).toHaveAttribute('aria-posinset', '1')
      expect(options()[0]).toHaveAttribute('aria-setsize', '700')
      expect(screen.getByRole('group', { name: 'Halls' })).toBeVisible()
    })

    it('picks the venue reached with the arrow keys in a later group', async () => {
      render(<GroupedVenues />)
      const input = screen.getByRole<HTMLInputElement>('combobox')
      await userEvent.click(input)
      await expect.poll(() => options().length).toBeGreaterThan(0)
      await userEvent.keyboard('{ArrowUp}')
      await expect.poll(() => active()?.textContent).toBe(LAST)
      expect(active()).toHaveAttribute('aria-posinset', '600')
      expect(active()).toHaveAttribute('aria-setsize', '600')
      expect(active()!.closest('[role="group"]')).toBe(
        screen.getByRole('group', { name: 'Teacups' })
      )
      const popup = document.querySelector('[data-slot="combobox-popup"]')!
      const row = active()!.getBoundingClientRect()
      const box = popup.getBoundingClientRect()
      expect(row.bottom).toBeLessThanOrEqual(box.bottom + 1)
      await userEvent.keyboard('{Enter}')
      await expect.poll(() => input.value).toBe(LAST)
    })

    const popup = () =>
      document.querySelector<HTMLElement>('[data-slot="combobox-popup"]')!
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

    it('keeps the group in view named, its label pinned to the top', async () => {
      render(<GroupedVenues />)
      await userEvent.click(screen.getByRole('combobox'))
      await expect.poll(() => options().length).toBeGreaterThan(0)
      // Well into Rooms, far past its label's own row.
      popup().scrollTop = 1000 * 32
      await expect
        .poll(() => screen.queryByRole('group', { name: 'Rooms' }))
        .not.toBeNull()
      const label = document.querySelector<HTMLElement>(
        '[data-slot="combobox-group-label"]'
      )!
      expect(label).toHaveTextContent('Rooms')
      const top = popup().getBoundingClientRect().top + popup().clientTop
      await expect
        .poll(() => Math.abs(label.getBoundingClientRect().top - top))
        .toBeLessThanOrEqual(1)
      // Opaque, so the rows scrolling under it don't show through.
      expect(getComputedStyle(label).backgroundColor).not.toBe(
        'rgba(0, 0, 0, 0)'
      )
      expect(screen.queryByRole('group', { name: 'Halls' })).toBeNull()
      // A Collection gets each venue's index in its group.
      const [first] = options()
      expect(first).toHaveAttribute(
        'data-place',
        String(Number(first!.getAttribute('aria-posinset')) - 1)
      )
    })

    it('keeps rows still as the group above scrolls out of the window', async () => {
      render(<GroupedVenues />)
      await userEvent.click(screen.getByRole('combobox'))
      await expect.poll(() => options().length).toBeGreaterThan(0)
      // The popup scales in as it opens, which would scale every distance.
      await Promise.all(
        popup()
          .getAnimations()
          .map((each) => each.finished)
      )
      // Rows below are estimated until drawn, so step towards the row.
      for (let tries = 0; tries < 40; tries++) {
        if (screen.queryByRole('option', { name: VENUES[712] })) break
        const top = Number(options()[0]!.textContent!.split(' ').at(-1))
        popup().scrollTop += (713 - top) * 24
        await frame()
        await frame()
      }
      const row = () => screen.getByRole('option', { name: VENUES[712] })
      row().scrollIntoView({ block: 'end' })
      let left = false
      for (let step = 0; step < 20 && !left; step++) {
        await frame()
        await frame()
        const before = row().getBoundingClientRect().top
        const scrolled = popup().scrollTop
        popup().scrollTop += 24
        await frame()
        await frame()
        const moved = popup().scrollTop - scrolled
        expect(
          Math.abs(row().getBoundingClientRect().top - (before - moved))
        ).toBeLessThanOrEqual(1)
        left = screen.queryByRole('group', { name: 'Halls' }) === null
      }
      expect(left).toBe(true)
    })

    it('opens on the chosen venue in a later group', async () => {
      render(<GroupedVenues defaultValue={VENUES[1500]} />)
      await userEvent.click(
        document.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!
      )
      const chosen = await screen.findByRole('option', { name: VENUES[1500] })
      const label = document.querySelector<HTMLElement>(
        '[data-slot="combobox-group-label"]'
      )!
      const box = popup().getBoundingClientRect()
      await expect
        .poll(() => chosen.getBoundingClientRect().top)
        .toBeGreaterThanOrEqual(label.getBoundingClientRect().bottom - 1)
      expect(chosen.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        box.bottom + 1
      )
    })
  })
})
