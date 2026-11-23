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
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

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
  { label: 'Halls', items: VENUES.slice(0, 700) },
  { label: 'Rooms', items: VENUES.slice(700, 1400) },
  { label: 'Teacups', items: VENUES.slice(1400) }
]

function GroupedVenues({
  groups = GROUPS,
  onSelect
}: {
  groups?: { label: string; items: string[] }[]
  onSelect?: (venue: string) => void
}) {
  return (
    <CommandPalette defaultOpen shortcut={false} items={groups} virtualized>
      <CommandPalette.Input placeholder='Search venues' />
      <CommandPalette.List>
        {(group: (typeof groups)[number]) => (
          <CommandPalette.Group key={group.label} items={group.items}>
            <CommandPalette.GroupLabel>{group.label}</CommandPalette.GroupLabel>
            <CommandPalette.Collection>
              {(venue: string) => (
                <CommandPalette.Item
                  key={venue}
                  value={venue}
                  onClick={() => onSelect?.(venue)}
                >
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

const labels = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-slot="command-palette-group-label"]'
    )
  )

/** The top of the list's scrollport, where a sticky label pins. */
const scrollportTop = () => {
  const list = screen.getByRole('listbox')
  return list.getBoundingClientRect().top + list.clientTop
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

  it('scrolls a command reached with the arrow keys flush with the bottom of the list', async () => {
    // Base UI also scrolls the highlighted row into view a frame later, which
    // hides a misplaced scroll by the virtualiser only some of the time.
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    render(<Venues />)
    const input = await screen.findByRole<HTMLInputElement>('combobox')
    await expect.poll(() => options().length).toBeGreaterThan(0)
    await expect.poll(() => document.activeElement).toBe(input)
    await userEvent.keyboard('{ArrowDown>40}')
    const highlighted = () =>
      document.getElementById(input.getAttribute('aria-activedescendant')!)
    await expect
      .poll(() => highlighted()?.getAttribute('aria-posinset'))
      .toBe('41')
    // Aligning the 41st row to the end puts its bottom at the bottom of the list's scrollport.
    const list = screen.getByRole('listbox')
    const scrollportBottom = () =>
      list.getBoundingClientRect().top + list.clientTop + list.clientHeight
    await expect
      .poll(() =>
        Math.abs(
          highlighted()!.getBoundingClientRect().bottom - scrollportBottom()
        )
      )
      .toBeLessThanOrEqual(1)
  })

  it('windows commands that arrive after it opens with none', async () => {
    function Arriving({ items }: { items: string[] }) {
      return (
        <CommandPalette
          defaultOpen
          shortcut={false}
          filter={null}
          items={items}
          virtualized
        >
          <CommandPalette.Input placeholder='Search venues' />
          <CommandPalette.List>
            {(venue: string) => (
              <CommandPalette.Item key={venue} value={venue}>
                {venue}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
        </CommandPalette>
      )
    }
    const { rerender } = render(<Arriving items={[]} />)
    const input = await screen.findByRole<HTMLInputElement>('combobox')
    await expect.poll(() => document.activeElement).toBe(input)
    rerender(<Arriving items={VENUES} />)
    await expect.poll(() => options().length).toBeGreaterThan(0)
    await userEvent.keyboard('{ArrowUp}')
    const highlighted = () =>
      document.getElementById(input.getAttribute('aria-activedescendant')!)
    await expect
      .poll(() => highlighted()?.getAttribute('aria-posinset'))
      .toBe('2000')
    const list = screen.getByRole('listbox').getBoundingClientRect()
    await expect
      .poll(() => highlighted()!.getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(list.bottom)
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
    const small = [
      { label: 'Halls', items: VENUES.slice(0, 3) },
      { label: 'Rooms', items: VENUES.slice(3, 6) }
    ]
    render(<GroupedVenues groups={small} />)
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

describe('CommandPalette virtualized, with groups', () => {
  it('windows grouped commands, each counted within its group', async () => {
    render(<GroupedVenues />)
    await expect.poll(() => options().length).toBeGreaterThan(0)
    expect(options().length).toBeLessThan(60)
    expect(options()[0]).toHaveAttribute('aria-posinset', '1')
    expect(options()[0]).toHaveAttribute('aria-setsize', '700')
    expect(screen.getByRole('group', { name: 'Halls' })).toContainElement(
      options()[0]!
    )
    expect(screen.queryByRole('group', { name: 'Teacups' })).toBeNull()
  })

  it('keeps the group in view named, its label pinned to the top', async () => {
    render(<GroupedVenues />)
    await expect.poll(() => options().length).toBeGreaterThan(0)
    const list = screen.getByRole('listbox')
    // Well into Rooms, far past its label's own row.
    list.scrollTop = 1000 * 40
    await expect
      .poll(() => screen.queryByRole('group', { name: 'Rooms' }))
      .not.toBeNull()
    const rooms = screen.getByRole('group', { name: 'Rooms' })
    const label = labels().find((element) => rooms.contains(element))!
    await expect
      .poll(() => Math.abs(label.getBoundingClientRect().top - scrollportTop()))
      .toBeLessThanOrEqual(1)
    expect(screen.queryByRole('group', { name: 'Halls' })).toBeNull()
    expect(options().length).toBeLessThan(60)
  })

  it('places each row where the whole list would, so scrolling to the end shows the last command', async () => {
    render(<GroupedVenues />)
    await expect.poll(() => options().length).toBeGreaterThan(0)
    const list = screen.getByRole('listbox')
    // Rows measure taller than their estimate as they appear, so keep going.
    await expect
      .poll(() => {
        list.scrollTop = list.scrollHeight
        return (
          screen.queryByRole('option', { name: VENUES.at(-1) }) !== null &&
          list.scrollHeight - list.clientHeight - list.scrollTop <= 1
        )
      })
      .toBe(true)
    const last = screen.getByRole('option', { name: VENUES.at(-1) })
    const bottom =
      list.getBoundingClientRect().top + list.clientTop + list.clientHeight
    expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(bottom + 1)
    expect(last.getBoundingClientRect().bottom).toBeGreaterThan(bottom - 40)
  })

  it('keeps rows still across a group boundary as the list scrolls', async () => {
    render(<GroupedVenues />)
    await expect.poll(() => options().length).toBeGreaterThan(0)
    const list = screen.getByRole('listbox')
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    // Walk down past the end of Halls, a few rows at a time.
    const row = () => screen.getByRole('option', { name: VENUES[699] })
    // Rows below are estimated until drawn, so step towards it.
    for (let tries = 0; tries < 40; tries++) {
      if (screen.queryByRole('option', { name: VENUES[699] })) break
      const top = Number(options()[0]!.textContent!.split(' ').at(-1))
      list.scrollTop += (700 - top) * 30
      await frame()
      await frame()
    }
    row().scrollIntoView({ block: 'end' })
    for (let step = 0; step < 8; step++) {
      await frame()
      await frame()
      const before = row().getBoundingClientRect().top
      const scrolled = list.scrollTop
      list.scrollTop += 60
      await frame()
      await frame()
      const moved = list.scrollTop - scrolled
      expect(
        Math.abs(row().getBoundingClientRect().top - (before - moved))
      ).toBeLessThanOrEqual(1)
    }
  })

  it('runs the last command, reached with the arrow keys', async () => {
    const onSelect = vi.fn()
    render(<GroupedVenues onSelect={onSelect} />)
    const input = await screen.findByRole<HTMLInputElement>('combobox')
    await expect.poll(() => options().length).toBeGreaterThan(0)
    await expect.poll(() => document.activeElement).toBe(input)
    await userEvent.keyboard('{ArrowUp}')
    const highlighted = () =>
      document.getElementById(input.getAttribute('aria-activedescendant')!)
    await expect.poll(() => highlighted()?.textContent).toBe(VENUES.at(-1))
    expect(highlighted()).toHaveAttribute('aria-posinset', '600')
    expect(highlighted()).toHaveAttribute('aria-setsize', '600')
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(VENUES.at(-1))
  })

  it('keeps a command reached going up clear of the pinned label', async () => {
    render(<GroupedVenues />)
    const input = await screen.findByRole<HTMLInputElement>('combobox')
    await expect.poll(() => options().length).toBeGreaterThan(0)
    await expect.poll(() => document.activeElement).toBe(input)
    await userEvent.keyboard('{ArrowDown>60}')
    await userEvent.keyboard('{ArrowUp>30}')
    const highlighted = () =>
      document.getElementById(input.getAttribute('aria-activedescendant')!)
    await expect
      .poll(() => highlighted()?.getAttribute('aria-posinset'))
      .toBe('31')
    const label = labels()[0]!
    await expect
      .poll(() => highlighted()!.getBoundingClientRect().top)
      .toBeGreaterThanOrEqual(label.getBoundingClientRect().bottom - 1)
  })

  it('filters the groups as someone types', async () => {
    render(<GroupedVenues />)
    const input = await screen.findByRole<HTMLInputElement>('combobox')
    await expect.poll(() => document.activeElement).toBe(input)
    await userEvent.keyboard(VENUES[1500]!)
    await expect
      .poll(() => options()[0]?.getAttribute('aria-setsize'))
      .toBe('1')
    expect(options()).toHaveLength(1)
    expect(options()[0]).toHaveTextContent(VENUES[1500]!)
    expect(labels().map((label) => label.textContent)).toEqual(['Teacups'])
  })
})
