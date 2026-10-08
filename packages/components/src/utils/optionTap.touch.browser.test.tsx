import { useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { page, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Autocomplete } from '../components/Autocomplete'
import { Button } from '../components/Button'
import { Combobox } from '../components/Combobox'
import { DateField } from '../components/DateField'
import { DateRangePicker } from '../components/DateRangePicker'
import { Drawer } from '../components/Drawer'
import { Menu } from '../components/Menu'
import { useStylesheet } from '../components/Pane/testUtils'
import { Select } from '../components/Select'
import { withFrames } from '../css/testUtils'
import { tapOn } from './touchTestUtils'

const TIMEOUT = { timeout: 20_000 }
const VENUES = ['Kazoo Hollow Room', 'Lighthouse Fig Lawn', 'Opal Harpoon Room']

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

// Nothing on the page is moving, such as a drawer sliding up or a list
// scaling in.
const settled = () =>
  withFrames(() =>
    expect
      .poll(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === 'running').length
      )
      .toBe(0)
  )
function InDrawer({ children }: { children: React.ReactNode }) {
  return (
    <Drawer defaultOpen>
      <Drawer.Content>
        <Drawer.Body>{children}</Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}

for (const spot of ['text', 'far right', 'top padding'] as const)
  describe(`An option tapped on its ${spot} in a drawer`, TIMEOUT, () => {
    it('is chosen from an Autocomplete', async () => {
      render(
        <InDrawer>
          <Autocomplete items={VENUES}>
            <Autocomplete.Input aria-label='Venue' />
            <Autocomplete.Portal>
              <Autocomplete.Positioner>
                <Autocomplete.Popup>
                  <Autocomplete.List>
                    {(venue: string) => (
                      <Autocomplete.Item key={venue} value={venue}>
                        {venue}
                      </Autocomplete.Item>
                    )}
                  </Autocomplete.List>
                </Autocomplete.Popup>
              </Autocomplete.Positioner>
            </Autocomplete.Portal>
          </Autocomplete>
        </InDrawer>
      )
      await settled()
      const input = screen.getByRole('combobox', { name: 'Venue' })
      await tapOn(input)
      await userEvent.type(input, 'lig')
      await tapOn(
        await screen.findByRole('option', { name: 'Lighthouse Fig Lawn' }),
        spot
      )
      expect(input).toHaveValue('Lighthouse Fig Lawn')
    })

    it('is chosen from a Combobox', async () => {
      function Venue() {
        const [venue, setVenue] = useState<string | null>(null)
        return (
          <InDrawer>
            <Combobox items={VENUES} value={venue} onValueChange={setVenue}>
              <Combobox.InputGroup>
                <Combobox.Input aria-label='Venue' />
                <Combobox.Trigger />
              </Combobox.InputGroup>
              <Combobox.Portal>
                <Combobox.Positioner>
                  <Combobox.Popup>
                    <Combobox.List>
                      {(item: string) => (
                        <Combobox.Item key={item} value={item}>
                          {item}
                        </Combobox.Item>
                      )}
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox>
            <output>{venue}</output>
          </InDrawer>
        )
      }
      render(<Venue />)
      await settled()
      const input = screen.getByRole('combobox', { name: 'Venue' })
      await tapOn(input)
      await userEvent.type(input, 'opa')
      await tapOn(
        await screen.findByRole('option', { name: 'Opal Harpoon Room' }),
        spot
      )
      expect(document.querySelector('output')).toHaveTextContent(
        'Opal Harpoon Room'
      )
    })

    it('is chosen once from a multiple Combobox', async () => {
      function Venues() {
        const [venues, setVenues] = useState<string[]>([])
        return (
          <InDrawer>
            <Combobox
              items={VENUES}
              multiple
              value={venues}
              onValueChange={setVenues}
            >
              <Combobox.InputGroup>
                <Combobox.Input aria-label='Venues' />
                <Combobox.Trigger />
              </Combobox.InputGroup>
              <Combobox.Portal>
                <Combobox.Positioner>
                  <Combobox.Popup>
                    <Combobox.List>
                      {(item: string) => (
                        <Combobox.Item key={item} value={item}>
                          {item}
                        </Combobox.Item>
                      )}
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox>
            <output>{venues.join(', ')}</output>
          </InDrawer>
        )
      }
      render(<Venues />)
      await settled()
      const input = screen.getByRole('combobox', { name: 'Venues' })
      await tapOn(input)
      await userEvent.type(input, 'opa')
      await tapOn(
        await screen.findByRole('option', { name: 'Opal Harpoon Room' }),
        spot
      )
      expect(document.querySelector('output')).toHaveTextContent(
        'Opal Harpoon Room'
      )
    })

    it('is chosen from a Select', async () => {
      function Venue() {
        const [venue, setVenue] = useState<string | null>(null)
        return (
          <InDrawer>
            <Select value={venue} onValueChange={setVenue}>
              <Select.Trigger aria-label='Venue'>
                <Select.Value placeholder='Choose' />
                <Select.Icon />
              </Select.Trigger>
              <Select.Content>
                {VENUES.map((item) => (
                  <Select.Item key={item} value={item}>
                    {item}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <output>{venue}</output>
          </InDrawer>
        )
      }
      render(<Venue />)
      await settled()
      await tapOn(screen.getByRole('combobox', { name: 'Venue' }))
      await settled()
      await tapOn(
        await screen.findByRole('option', { name: 'Lighthouse Fig Lawn' }),
        spot
      )
      expect(document.querySelector('output')).toHaveTextContent(
        'Lighthouse Fig Lawn'
      )
    })

    it('runs from a Menu', async () => {
      const chosen: string[] = []
      render(
        <InDrawer>
          <Menu>
            <Menu.Trigger render={<Button />}>Actions</Menu.Trigger>
            <Menu.Content>
              <Menu.Item onClick={() => chosen.push('duplicate')}>
                Duplicate
              </Menu.Item>
            </Menu.Content>
          </Menu>
        </InDrawer>
      )
      await settled()
      await tapOn(screen.getByRole('button', { name: 'Actions' }))
      await tapOn(
        await screen.findByRole('menuitem', { name: 'Duplicate' }),
        spot
      )
      expect(chosen).toEqual(['duplicate'])
    })

    it('fills a DateRangePicker end from its suggestions', async () => {
      render(<DateRangePicker aria-label='Sales period' today='2026-10-07' />)
      await tapOn(screen.getByRole('button', { name: /^Choose dates/ }))
      const drawer = await screen.findByRole('dialog')
      await settled()
      const start = within(drawer).getByRole('combobox', { name: 'Start' })
      await tapOn(start)
      await userEvent.type(start, 'tom')
      await tapOn(
        await screen.findByRole('option', { name: /^Tomorrow/ }),
        spot
      )
      expect(start).toHaveValue('8 Oct 2026')
      await expect.poll(() => screen.queryByRole('listbox')).toBeNull()
    })
  })

describe('A touch on a suggestion', TIMEOUT, () => {
  function Venue({
    open,
    onValueChange
  }: {
    open?: boolean
    onValueChange?: (value: string) => void
  }) {
    return (
      <InDrawer>
        <Autocomplete items={VENUES} open={open} onValueChange={onValueChange}>
          <Autocomplete.Input aria-label='Venue' />
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.List>
                  {(venue: string) => (
                    <Autocomplete.Item key={venue} value={venue}>
                      {venue}
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete>
      </InDrawer>
    )
  }

  // Sent by hand: a real swipe here always ends in pointercancel, which no
  // code could turn into a choice, so it couldn't fail.
  it('that moves away before it lifts chooses nothing', async () => {
    const onValueChange = vi.fn()
    render(<Venue onValueChange={onValueChange} />)
    await settled()
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await tapOn(input)
    await userEvent.type(input, 'o')
    const option = await screen.findByRole('option', {
      name: 'Lighthouse Fig Lawn'
    })
    const other = screen.getByRole('option', { name: 'Opal Harpoon Room' })
    await settled()
    onValueChange.mockClear()
    option.dispatchEvent(new PointerEvent('pointerdown', touchAt(option, 10)))
    option.dispatchEvent(
      new PointerEvent('pointermove', touchAt(option, 10, 60))
    )
    option.dispatchEvent(new PointerEvent('pointerup', touchAt(option, 10, 60)))
    // A still tap after it chooses, so the list was still open to choose.
    other.dispatchEvent(new PointerEvent('pointerdown', touchAt(other, 13)))
    other.dispatchEvent(new PointerEvent('pointerup', touchAt(other, 13)))
    await expect
      .poll(() =>
        onValueChange.mock.calls
          .filter(([, details]) => details.reason === 'item-press')
          .map(([value]) => value)
      )
      .toEqual(['Opal Harpoon Room'])
  })

  it('chooses a lone touch that says it is not the primary pointer', async () => {
    render(<Venue />)
    await settled()
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await tapOn(input)
    await userEvent.type(input, 'li')
    const option = await screen.findByRole('option', {
      name: 'Lighthouse Fig Lawn'
    })
    await settled()
    const { left, top, height } = option.getBoundingClientRect()
    const pointer = {
      clientX: left + 20,
      clientY: top + height / 2,
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 9,
      pointerType: 'touch',
      isPrimary: false
    }
    const down = new PointerEvent('pointerdown', pointer)
    option.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(false)
    option.dispatchEvent(new PointerEvent('pointerup', pointer))
    await expect
      .poll(() => (input as HTMLInputElement).value)
      .toBe('Lighthouse Fig Lawn')
  })

  const touchAt = (option: Element, pointerId: number, dy = 0) => {
    const { left, top, height } = option.getBoundingClientRect()
    return {
      clientX: left + 20,
      clientY: top + height / 2 + dy,
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId,
      pointerType: 'touch',
      isPrimary: true
    }
  }

  it('chooses once when a slight drift still ends in a click', async () => {
    const onValueChange = vi.fn()
    render(
      <InDrawer>
        <Autocomplete items={VENUES} onValueChange={onValueChange}>
          <Autocomplete.Input aria-label='Venue' />
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.List>
                  {(venue: string) => (
                    <Autocomplete.Item key={venue} value={venue}>
                      {venue}
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete>
      </InDrawer>
    )
    await settled()
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await tapOn(input)
    await userEvent.type(input, 'li')
    const option = await screen.findByRole('option', {
      name: 'Lighthouse Fig Lawn'
    })
    await settled()
    onValueChange.mockClear()
    option.dispatchEvent(new PointerEvent('pointerdown', touchAt(option, 11)))
    option.dispatchEvent(
      new PointerEvent('pointermove', touchAt(option, 11, 12))
    )
    option.dispatchEvent(new PointerEvent('pointerup', touchAt(option, 11, 12)))
    // The compatibility events a browser still sends inside its own slop.
    option.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 0 })
    )
    option.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, button: 0 })
    )
    option.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
    const presses = () =>
      onValueChange.mock.calls.filter(
        ([, details]) => details.reason === 'item-press'
      )
    await expect.poll(() => presses().length).toBeGreaterThan(0)
    // Every event was sent above, so a second choice would have come with them.
    expect(presses()).toHaveLength(1)
  })

  it('closes, once a held finger scrolls away, when asked to while it was down', async () => {
    render(<Venue />)
    await settled()
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await tapOn(input)
    await userEvent.type(input, 'li')
    const option = await screen.findByRole('option', {
      name: 'Lighthouse Fig Lawn'
    })
    await settled()
    option.dispatchEvent(new PointerEvent('pointerdown', touchAt(option, 12)))
    await userEvent.keyboard('{Escape}')
    // An Escape closes at once, so a list not held would already be leaving.
    expect(
      screen.getByRole('listbox').closest('[data-ending-style]')
    ).toBeNull()
    option.dispatchEvent(new PointerEvent('pointercancel', touchAt(option, 12)))
    await expect.poll(() => screen.queryByRole('listbox')).toBeNull()
    expect(input).toHaveValue('li')
  })

  it('closes, once a held finger scrolls away, when asked to while it was down, with open passed as undefined', async () => {
    render(<Venue open={undefined} />)
    await settled()
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await tapOn(input)
    await userEvent.type(input, 'li')
    const option = await screen.findByRole('option', {
      name: 'Lighthouse Fig Lawn'
    })
    await settled()
    option.dispatchEvent(new PointerEvent('pointerdown', touchAt(option, 12)))
    await userEvent.keyboard('{Escape}')
    // An Escape closes at once, so a list not held would already be leaving.
    expect(
      screen.getByRole('listbox').closest('[data-ending-style]')
    ).toBeNull()
    option.dispatchEvent(new PointerEvent('pointercancel', touchAt(option, 12)))
    await expect.poll(() => screen.queryByRole('listbox')).toBeNull()
    expect(input).toHaveValue('li')
  })

  it('chooses on lifting even when the input blurs and the page resizes first', async () => {
    render(<Venue />)
    await settled()
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await tapOn(input)
    await userEvent.type(input, 'li')
    const option = await screen.findByRole('option', {
      name: 'Lighthouse Fig Lawn'
    })
    await settled()
    const { left, top, height } = option.getBoundingClientRect()
    const at = { clientX: left + 20, clientY: top + height / 2 }
    const pointer = {
      ...at,
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true
    }
    option.dispatchEvent(new PointerEvent('pointerdown', pointer))
    // The keyboard dismissing: the input blurs and the viewport grows.
    input.blur()
    window.visualViewport?.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    await settled()
    const lifted = screen.getByRole('option', { name: 'Lighthouse Fig Lawn' })
    lifted.dispatchEvent(new PointerEvent('pointerup', pointer))
    await expect
      .poll(() => (input as HTMLInputElement).value)
      .toBe('Lighthouse Fig Lawn')
  })
})

describe('A date suggestion tapped twice', TIMEOUT, () => {
  it('shows the date again when the same one is chosen', async () => {
    function Controlled() {
      const [date, setDate] = useState<string | null>(null)
      return (
        <>
          <DateField
            aria-label='Show date'
            today='2026-10-07'
            value={date}
            onValueChange={setDate}
          />
          <output>{date}</output>
        </>
      )
    }
    render(<Controlled />)
    const input = screen.getByRole('combobox', { name: 'Show date' })
    for (let round = 0; round < 3; round++) {
      await tapOn(input)
      await userEvent.clear(input)
      await userEvent.type(input, 'wed')
      await tapOn(await screen.findByRole('option', { name: /^Wed/ }))
      await expect
        .poll(() => (input as HTMLInputElement).value)
        .toBe('Wed 7 Oct 2026')
      expect(document.querySelector('output')).toHaveTextContent('2026-10-07')
    }
  })
})
