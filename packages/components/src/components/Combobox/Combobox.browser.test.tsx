import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Combobox } from '.'
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

function Genres() {
  return (
    // @ts-expect-error Roadie's Combobox types don't take `multiple` yet
    <Combobox items={['Rock', 'Jazz', 'Hip hop']} multiple>
      <Combobox.InputGroup>
        <Combobox.Input aria-label='Genres' />
        <Combobox.Trigger />
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.List>
              {(genre: string) => (
                <Combobox.Item key={genre} value={genre}>
                  {genre}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox>
  )
}

async function tapJazz() {
  render(<Genres />)
  await userEvent.click(screen.getByRole('combobox', { name: 'Genres' }))
  const tapped = await screen.findByRole('option', { name: 'Jazz' })
  const resting = screen.getByRole('option', { name: 'Rock' })
  await pointAt(tapped)
  await userEvent.click(tapped)
  await expect.poll(() => tapped.getAttribute('aria-selected')).toBe('true')
  expect(tapped).toHaveAttribute('data-highlighted')
  return { resting, tapped }
}

describe('Combobox options on a touch screen', () => {
  it('drop the highlight once a tapped option leaves the list open', async () => {
    setHoverCapable(false)
    const { resting, tapped } = await tapJazz()

    expect(fill(tapped)).toBe(fill(resting))
  })

  it('still highlight under a pointer that can hover', async () => {
    setHoverCapable(true)
    const { resting, tapped } = await tapJazz()

    expect(fill(tapped)).not.toBe(fill(resting))
  })

  it('still highlight the option a keyboard moves to', async () => {
    setHoverCapable(false)
    render(<Genres />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    const first = await screen.findByRole('option', { name: 'Rock' })
    const second = screen.getByRole('option', { name: 'Jazz' })
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => second.hasAttribute('data-highlighted')).toBe(true)

    expect(fill(second)).not.toBe(fill(first))
  })

  it('highlight by keyboard again after a tap', async () => {
    setHoverCapable(false)
    const { resting } = await tapJazz()
    await userEvent.keyboard('{ArrowUp}')
    await expect.poll(() => resting.hasAttribute('data-highlighted')).toBe(true)

    expect(fill(resting)).not.toBe(
      fill(screen.getByRole('option', { name: 'Hip hop' }))
    )
  })
})

const venues = [
  { name: 'The Longacre', location: 'Fortitude Valley, QLD' },
  { name: 'Meridian Stage', location: 'South Bank, QLD' }
]
type Venue = (typeof venues)[number]

function Venues() {
  return (
    <Combobox
      items={venues}
      itemToStringLabel={(venue) => (venue as Venue).name}
    >
      <Combobox.InputGroup>
        <Combobox.Input aria-label='Venue' />
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.List>
              {(venue: Venue) => (
                <Combobox.Item key={venue.name} value={venue}>
                  {venue.name}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox>
  )
}

describe('Combobox with object items', () => {
  it('filters on the label and fills the input with it', async () => {
    render(<Venues />)
    const input = screen.getByRole('combobox', { name: 'Venue' })
    await userEvent.click(input)
    await userEvent.keyboard('Meridian')
    await expect
      .poll(() => screen.queryAllByRole('option').map((o) => o.textContent))
      .toEqual(['Meridian Stage'])
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect
      .poll(() => (input as HTMLInputElement).value)
      .toBe('Meridian Stage')
  })
})
