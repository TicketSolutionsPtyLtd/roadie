import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import { Autocomplete, type AutocompleteProps } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { setHoverCapable } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(() => {
  setHoverCapable(true)
  cleanup()
})

const fill = (element: Element) => getComputedStyle(element).backgroundColor

// Base UI ignores a WebKit mousemove with no movement, which is all
// Playwright sends there, so move onto the option the way a hand would.
async function pointAt(option: Element) {
  await userEvent.hover(option)
  option.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, movementX: 1, movementY: 1 })
  )
}

async function openCities(
  onItemHighlighted?: AutocompleteProps['onItemHighlighted']
) {
  render(
    <Autocomplete
      items={['Brisbane', 'Sydney', 'Melbourne']}
      onItemHighlighted={onItemHighlighted}
    >
      <Autocomplete.InputGroup>
        <Autocomplete.Input aria-label='City' />
      </Autocomplete.InputGroup>
      <Autocomplete.Portal>
        <Autocomplete.Positioner>
          <Autocomplete.Popup>
            <Autocomplete.List>
              {(city: string) => (
                <Autocomplete.Item key={city} value={city}>
                  {city}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete>
  )
  await userEvent.click(screen.getByRole('combobox', { name: 'City' }))
  await userEvent.keyboard('e')
  const first = await screen.findByRole('option', { name: 'Brisbane' })
  const second = screen.getByRole('option', { name: 'Sydney' })
  return { first, second }
}

describe('Autocomplete options on a touch screen', () => {
  it('drop a highlight the pointer made while the list stays open', async () => {
    setHoverCapable(false)
    const { first, second } = await openCities()
    await pointAt(second)
    await expect.poll(() => second.hasAttribute('data-highlighted')).toBe(true)

    expect(fill(second)).toBe(fill(first))
  })

  it('still highlight under a pointer that can hover', async () => {
    setHoverCapable(true)
    const { first, second } = await openCities()
    await pointAt(second)
    await expect.poll(() => second.hasAttribute('data-highlighted')).toBe(true)

    expect(fill(second)).not.toBe(fill(first))
  })

  it('still highlight the option a keyboard moves to', async () => {
    setHoverCapable(false)
    const { first, second } = await openCities()
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => second.hasAttribute('data-highlighted')).toBe(true)

    expect(fill(second)).not.toBe(fill(first))
  })

  it('still calls its own onItemHighlighted', async () => {
    const onItemHighlighted = vi.fn()
    await openCities(onItemHighlighted)
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => onItemHighlighted.mock.lastCall?.[0]).toBe('Sydney')
  })
})

const [ochre, apricot] = [
  {
    name: 'Ochre Kite Weekender',
    venue: 'Lighthouse Fig Lawn, Crawley',
    date: '19 Apr'
  },
  {
    name: 'Apricot Cyclone Fest',
    venue: 'Clockwork Wattle Brewery, Fremantle',
    date: '11 Apr'
  }
]
const events = [ochre, apricot]
type LiveEvent = typeof ochre
const eventText = (event: unknown) => {
  const { name, venue, date } = event as LiveEvent
  return `${name} · ${venue} · ${date}`
}

function Events() {
  return (
    <Autocomplete items={events} itemToStringValue={eventText}>
      <Autocomplete.InputGroup>
        <Autocomplete.Input aria-label='Event' />
      </Autocomplete.InputGroup>
      <Autocomplete.Portal>
        <Autocomplete.Positioner>
          <Autocomplete.Popup>
            <Autocomplete.List>
              {(event: LiveEvent) => (
                <Autocomplete.Item key={event.name} value={event}>
                  {event.name}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete>
  )
}

describe('Autocomplete with object items', () => {
  it('starts empty and filters on the text itemToStringValue gives', async () => {
    render(<Events />)
    const input = screen.getByRole('combobox', { name: 'Event' })
    expect(input).toHaveValue('')
    await userEvent.click(input)
    await userEvent.keyboard('Crawley')
    await expect
      .poll(() => screen.queryAllByRole('option').map((o) => o.textContent))
      .toEqual(['Ochre Kite Weekender'])
    expect(input).toHaveValue('Crawley')
  })

  it('fills the input from itemToStringValue when an option is tapped', async () => {
    render(<Events />)
    const input = screen.getByRole('combobox', { name: 'Event' })
    await userEvent.click(input)
    await userEvent.keyboard('Apricot')
    await userEvent.click(
      await screen.findByRole('option', { name: 'Apricot Cyclone Fest' })
    )
    await expect
      .poll(() => (input as HTMLInputElement).value)
      .toBe(eventText(apricot))
  })

  it('fills the input from itemToStringValue when chosen by keyboard', async () => {
    render(<Events />)
    const input = screen.getByRole('combobox', { name: 'Event' })
    await userEvent.click(input)
    await userEvent.keyboard('Ochre')
    await screen.findByRole('option', { name: 'Ochre Kite Weekender' })
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect
      .poll(() => (input as HTMLInputElement).value)
      .toBe(eventText(ochre))
  })
})
