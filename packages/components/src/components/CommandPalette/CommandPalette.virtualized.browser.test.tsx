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
      <CommandPalette.Empty>No venues match</CommandPalette.Empty>
    </CommandPalette>
  )
}

const GROUPS = [
  { label: 'Halls', items: VENUES.slice(0, 3) },
  { label: 'Rooms', items: VENUES.slice(3, 6) }
]

function GroupedVenues() {
  return (
    <CommandPalette defaultOpen shortcut={false} items={GROUPS} virtualized>
      <CommandPalette.Input placeholder='Search venues' />
      <CommandPalette.List>
        {(group: (typeof GROUPS)[number]) => (
          <CommandPalette.Group key={group.label} items={group.items}>
            <CommandPalette.GroupLabel>{group.label}</CommandPalette.GroupLabel>
            <CommandPalette.Collection>
              {(venue: string) => (
                <CommandPalette.Item key={venue} value={venue}>
                  {venue}
                </CommandPalette.Item>
              )}
            </CommandPalette.Collection>
          </CommandPalette.Group>
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

  it.each([
    ['{ArrowDown>40}', '41'],
    ['{ArrowUp}', '2000']
  ])('keeps the command reached with %s in view', async (keys, position) => {
    render(<Venues />)
    const input = await screen.findByRole<HTMLInputElement>('combobox')
    await expect.poll(() => options().length).toBeGreaterThan(0)
    await expect.poll(() => document.activeElement).toBe(input)
    await userEvent.keyboard(keys)
    const highlighted = () =>
      document.getElementById(input.getAttribute('aria-activedescendant')!)
    await expect
      .poll(() => highlighted()?.getAttribute('aria-posinset'))
      .toBe(position)
    const list = screen.getByRole('listbox').getBoundingClientRect()
    await expect
      .poll(() => highlighted()!.getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(list.bottom)
    expect(highlighted()!.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      list.top
    )
  })

  it('hides the list when no command matches', async () => {
    render(<Venues />)
    await expect
      .poll(() => document.activeElement)
      .toBe(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeVisible()
    await userEvent.keyboard('no such venue')
    await expect.element(screen.getByText('No venues match')).toBeVisible()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('reaches every command with the arrow keys when the items are groups', async () => {
    render(<GroupedVenues />)
    const input = await screen.findByRole<HTMLInputElement>('combobox')
    await expect.poll(() => options().length).toBe(6)
    await expect.poll(() => document.activeElement).toBe(input)
    await userEvent.keyboard('{ArrowDown>4}')
    await expect
      .poll(
        () =>
          document.getElementById(input.getAttribute('aria-activedescendant')!)
            ?.textContent
      )
      .toBe(VENUES[4])
  })
})
