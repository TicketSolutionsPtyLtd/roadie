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
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    await expect.poll(() => second.hasAttribute('data-highlighted')).toBe(true)

    expect(fill(second)).not.toBe(fill(first))
  })

  it('still calls its own onItemHighlighted', async () => {
    const onItemHighlighted = vi.fn()
    await openCities(onItemHighlighted)
    await userEvent.keyboard('{ArrowDown}')
    await expect
      .poll(() => onItemHighlighted.mock.lastCall?.[0])
      .toBe('Brisbane')
  })
})
