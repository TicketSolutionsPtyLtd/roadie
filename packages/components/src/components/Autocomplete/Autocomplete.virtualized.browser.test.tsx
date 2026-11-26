import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import { Autocomplete } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { venues } from '../../utils/frameTestUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(cleanup)

const VENUES = venues(2000)

function Venues() {
  return (
    <Autocomplete items={VENUES} virtualized>
      <Autocomplete.InputGroup>
        <Autocomplete.Input aria-label='Venue' />
      </Autocomplete.InputGroup>
      <Autocomplete.Portal>
        <Autocomplete.Positioner>
          <Autocomplete.Popup className='max-h-80'>
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
  )
}

const options = () => screen.queryAllByRole('option')

describe('Autocomplete virtualized', () => {
  it('windows its suggestions, each knowing its place in the whole list', async () => {
    render(<Venues />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.keyboard('1')
    await expect.poll(() => options().length).toBeGreaterThan(0)
    const size = Number(options()[0]!.getAttribute('aria-setsize'))
    expect(size).toBeGreaterThan(500)
    expect(options().length).toBeLessThan(60)
    expect(options()[0]).toHaveAttribute('aria-posinset', '1')
  })

  it('takes the last suggestion, reached with the arrow keys', async () => {
    render(<Venues />)
    const input = screen.getByRole<HTMLInputElement>('combobox')
    await userEvent.click(input)
    await userEvent.keyboard('1')
    await expect.poll(() => options().length).toBeGreaterThan(0)
    await userEvent.keyboard('{ArrowUp}')
    const id = () => input.getAttribute('aria-activedescendant')
    await expect.poll(() => id() && document.getElementById(id()!)).toBeTruthy()
    const last = document.getElementById(id()!)!
    expect(last.getAttribute('aria-posinset')).toBe(
      last.getAttribute('aria-setsize')
    )
    const name = last.textContent
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => input.value).toBe(name)
  })
})
