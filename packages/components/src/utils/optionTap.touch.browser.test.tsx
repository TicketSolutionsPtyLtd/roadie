import { useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

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

const TIMEOUT = { timeout: 20_000 }
const VENUES = ['Kazoo Hollow Room', 'Lantern Yard', 'Velvet Ferry']

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(390, 844)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const settle = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

type Spot = 'text' | 'far right' | 'top padding'

// Waits out a popup's scale-in, so the tap lands where the row ends up.
async function tapOn(element: Element, spot: Spot = 'text') {
  await settle(300)
  const { left, top, right, width, height } = element.getBoundingClientRect()
  const [x, y] =
    spot === 'far right'
      ? [right - 4, top + height / 2]
      : spot === 'top padding'
        ? [left + width / 2, top + 2]
        : [left + Math.min(20, width / 2), top + height / 2]
  await commands.tap(x, y)
  await settle(200)
}

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
      await settle()
      const input = screen.getByRole('combobox', { name: 'Venue' })
      await tapOn(input)
      await userEvent.type(input, 'lan')
      await tapOn(
        await screen.findByRole('option', { name: 'Lantern Yard' }),
        spot
      )
      expect(input).toHaveValue('Lantern Yard')
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
      await settle()
      const input = screen.getByRole('combobox', { name: 'Venue' })
      await tapOn(input)
      await userEvent.type(input, 'vel')
      await tapOn(
        await screen.findByRole('option', { name: 'Velvet Ferry' }),
        spot
      )
      expect(document.querySelector('output')).toHaveTextContent('Velvet Ferry')
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
      await settle()
      const input = screen.getByRole('combobox', { name: 'Venues' })
      await tapOn(input)
      await userEvent.type(input, 'vel')
      await tapOn(
        await screen.findByRole('option', { name: 'Velvet Ferry' }),
        spot
      )
      expect(document.querySelector('output')).toHaveTextContent('Velvet Ferry')
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
      await settle()
      await tapOn(screen.getByRole('combobox', { name: 'Venue' }))
      await settle()
      await tapOn(
        await screen.findByRole('option', { name: 'Lantern Yard' }),
        spot
      )
      expect(document.querySelector('output')).toHaveTextContent('Lantern Yard')
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
      await settle()
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
      await settle(800)
      const start = within(drawer).getByRole('combobox', { name: 'Start' })
      await tapOn(start)
      await userEvent.type(start, 'tom')
      await tapOn(
        await screen.findByRole('option', { name: /^Tomorrow/ }),
        spot
      )
      expect(start).toHaveValue('8 Oct 2026')
      expect(screen.queryByRole('listbox')).toBeNull()
    })
  })

describe('A touch on a suggestion', TIMEOUT, () => {
  function Venue() {
    return (
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
  }

  it('that moves away before it lifts chooses nothing', async ({ skip }) => {
    if (!navigator.userAgent.includes('Chrome')) skip()
    render(<Venue />)
    await settle()
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await tapOn(input)
    await userEvent.type(input, 'la')
    const option = await screen.findByRole('option', { name: 'Lantern Yard' })
    await settle(300)
    const { left, top, height } = option.getBoundingClientRect()
    const y = top + height / 2
    await commands.swipe({ x: left + 20, y }, { x: left + 20, y: y + 60 })
    await settle()
    expect(input).toHaveValue('la')
  })

  it('chooses a lone touch that says it is not the primary pointer', async () => {
    render(<Venue />)
    await settle()
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await tapOn(input)
    await userEvent.type(input, 'la')
    const option = await screen.findByRole('option', { name: 'Lantern Yard' })
    await settle(300)
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
    await settle()
    expect(input).toHaveValue('Lantern Yard')
  })

  it('chooses on lifting even when the input blurs and the page resizes first', async () => {
    render(<Venue />)
    await settle()
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await tapOn(input)
    await userEvent.type(input, 'la')
    const option = await screen.findByRole('option', { name: 'Lantern Yard' })
    await settle(300)
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
    await settle(150)
    const lifted = screen.getByRole('option', { name: 'Lantern Yard' })
    lifted.dispatchEvent(new PointerEvent('pointerup', pointer))
    await settle()
    expect(input).toHaveValue('Lantern Yard')
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
