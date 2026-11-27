import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import { Combobox } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { venues } from '../../utils/frameTestUtils'

// Its own file, so the windowed list's chunk hasn't loaded when the first
// test opens it, as on a page that opens one straight after it mounts.

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(cleanup)

const VENUES = venues(2000)
const CHOSEN = VENUES[1500]!

function Venues({ open }: { open: boolean }) {
  return (
    <Combobox items={VENUES} virtualized defaultValue={CHOSEN} open={open}>
      <Combobox.Input aria-label='Venue' />
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

async function expectChosenInView() {
  const chosen = await screen.findByRole('option', { name: CHOSEN })
  const popup = document.querySelector('[data-slot="combobox-popup"]')!
  const box = popup.getBoundingClientRect()
  expect(chosen.getBoundingClientRect().top).toBeGreaterThanOrEqual(box.top - 1)
  expect(chosen.getBoundingClientRect().bottom).toBeLessThanOrEqual(
    box.bottom + 1
  )
}

describe('Combobox virtualized, opened by its parent', () => {
  it('opens on the chosen venue, and reopens on it', async () => {
    const { rerender } = render(<Venues open={false} />)
    rerender(<Venues open />)
    await expectChosenInView()
    rerender(<Venues open={false} />)
    await expect.poll(() => screen.queryAllByRole('option').length).toBe(0)
    rerender(<Venues open />)
    await expectChosenInView()
  })
})
