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

    function GroupedVenues() {
      return (
        <Combobox items={GROUPS} virtualized>
          <Combobox.InputGroup>
            <Combobox.Input aria-label='Venue' />
            <Combobox.Trigger />
          </Combobox.InputGroup>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup className='max-h-80'>
                <Combobox.List>
                  {(group: (typeof GROUPS)[number]) => (
                    <Combobox.Group key={group.label} items={group.items}>
                      <Combobox.GroupLabel>{group.label}</Combobox.GroupLabel>
                      <Combobox.Collection>
                        {(venue: string) => (
                          <Combobox.Item key={venue} value={venue}>
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
  })
})
