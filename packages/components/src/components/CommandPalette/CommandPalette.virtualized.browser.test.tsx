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

import { CommandPalette } from '.'
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

function Venues({ onSelect }: { onSelect?: (venue: string) => void }) {
  return (
    <CommandPalette defaultOpen shortcut={false} items={VENUES} virtualized>
      <CommandPalette.Input placeholder='Search venues' />
      <CommandPalette.List>
        {(venue: string) => (
          <CommandPalette.Item
            key={venue}
            value={venue}
            onClick={() => onSelect?.(venue)}
          >
            {venue}
          </CommandPalette.Item>
        )}
      </CommandPalette.List>
    </CommandPalette>
  )
}

const options = () => screen.queryAllByRole('option')

describe('CommandPalette virtualized', () => {
  it('windows its commands, each knowing its place in the whole list', async () => {
    render(<Venues />)
    await expect.poll(() => options().length).toBeGreaterThan(0)
    expect(options()[0]).toHaveAttribute('aria-setsize', '2000')
    expect(options()[0]).toHaveAttribute('aria-posinset', '1')
    expect(options().length).toBeLessThan(60)
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('combobox'))
    await userEvent.keyboard(VENUES[1500]!)
    await expect
      .poll(() => options()[0]?.getAttribute('aria-setsize'))
      .toBe('1')
    expect(options()[0]).toHaveTextContent(VENUES[1500]!)
  })

  it('runs the last command, reached with the arrow keys', async () => {
    const onSelect = vi.fn()
    render(<Venues onSelect={onSelect} />)
    const input = await screen.findByRole<HTMLInputElement>('combobox')
    await expect.poll(() => options().length).toBeGreaterThan(0)
    await expect.poll(() => document.activeElement).toBe(input)
    await userEvent.keyboard('{ArrowUp}')
    const id = () => input.getAttribute('aria-activedescendant')
    await expect.poll(() => id() && document.getElementById(id()!)).toBeTruthy()
    const last = document.getElementById(id()!)!
    expect(last).toHaveAttribute('aria-posinset', '2000')
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(VENUES.at(-1))
  })
})
