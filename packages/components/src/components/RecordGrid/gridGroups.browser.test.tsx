import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { pickOption } from '@oztix/roadie-browser-testing'

import { RecordGrid } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import {
  type TestShow,
  groupedShowFields,
  showFields,
  testShows
} from '../Records/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
  await import('./RecordGridSettings')
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  window.scrollTo(0, 0)
})

const card = {
  title: 'show',
  description: 'city',
  trailing: 'status',
  details: ['sold']
} as const

const grouped = { layout: { type: 'grid', groupBy: ['status'] } } as const

const cardsIn = (element: Element) => [
  ...element.querySelectorAll<HTMLElement>('[data-slot="record-grid-card"]')
]
const names = (element: Element) =>
  cardsIn(element).map((item) => item.querySelector('a')?.textContent)
// Each group is an Accordion item: its summary holds the title.
const disclosure = (name: string) =>
  screen.getByRole('heading', { name }).closest('summary')!
// A closed item keeps its cards in the DOM, out of sight.
const shown = (element: Element) => element.checkVisibility()

describe('RecordGrid grouped in a browser', { timeout: 30_000 }, () => {
  it('nests cards under a heading and count per group, h2 to h4 by level, leaving out empty ones', () => {
    render(
      <RecordGrid
        caption='Shows'
        data={testShows(6)}
        fields={groupedShowFields}
        getRowHref={(show: TestShow) => `/shows/${show.id}`}
        card={card}
        defaultView={{
          layout: { type: 'grid', groupBy: ['status', 'city', 'show'] }
        }}
      />
    )
    const headings = screen
      .getAllByRole('heading')
      .map((heading) => [heading.tagName, heading.textContent])
    expect(headings.slice(0, 5)).toEqual([
      ['H2', 'On sale 2'],
      ['H3', 'Brisbane 1'],
      ['H4', 'Ocean Alley 1 1'],
      ['H3', 'Perth 1'],
      ['H4', 'angie McMahon 1 1']
    ])
    expect(names(screen.getByRole('list', { name: 'On sale 2' }))).toEqual([
      'Ocean Alley 1',
      'angie McMahon 1'
    ])
    expect(
      names(screen.getAllByRole('list', { name: 'Brisbane 1' })[0]!)
    ).toEqual(['Ocean Alley 1'])
    // The same tiers as the list's titles.
    const size = (level: number) =>
      parseFloat(
        getComputedStyle(screen.getAllByRole('heading', { level })[0]!).fontSize
      )
    expect(size(2)).toBeGreaterThan(size(3))
    expect(size(3)).toBeGreaterThan(size(4))
    expect(screen.getByRole('list', { name: 'Shows' })).toBeVisible()
  })

  it("shows the field's heading content under its group's title", () => {
    render(
      <RecordGrid
        data={testShows(6)}
        fields={showFields.map((one) =>
          one.key === 'status'
            ? { ...one, groupHeading: ({ count }) => `${count} shows here` }
            : one
        )}
        card={card}
        defaultView={grouped}
      />
    )
    const extra = screen.getAllByText('2 shows here')[0]!
    expect(extra).toBeVisible()
    // It starts where its title's text does.
    const text = document.createRange()
    text.selectNodeContents(extra)
    expect(text.getBoundingClientRect().left).toBeCloseTo(
      screen.getByRole('heading', { name: 'On sale 2' }).getBoundingClientRect()
        .left,
      0
    )
  })

  it.each([
    [390, 1],
    [1000, 3]
  ])(
    'lays out a group at %ipx as %i columns, inside its section',
    (width, columns) => {
      render(
        <div style={{ width }}>
          <RecordGrid
            data={testShows(12)}
            fields={showFields}
            card={card}
            defaultView={grouped}
          />
        </div>
      )
      const group = cardsIn(screen.getByRole('list', { name: 'On sale 4' }))
      const top = Math.round(group[0]!.getBoundingClientRect().top)
      expect(
        group.filter(
          (item) => Math.round(item.getBoundingClientRect().top) === top
        )
      ).toHaveLength(columns)
      const title = disclosure('On sale 4').getBoundingClientRect()
      expect(group[0]!.getBoundingClientRect().top).toBeGreaterThan(
        title.bottom
      )
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        window.innerWidth
      )
    }
  )

  it("draws a card's focus ring whole, clear of its group's clipping", () => {
    render(
      <RecordGrid
        data={testShows(12)}
        fields={showFields}
        getRowHref={(show: TestShow) => `/shows/${show.id}`}
        card={card}
        defaultView={grouped}
      />
    )
    const ring = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--focus-ring-width'
      )
    )
    const group = screen.getByRole('list', { name: 'On sale 4' })
    const cards = cardsIn(group).map((item) => item.getBoundingClientRect())
    const ringBox = {
      left: Math.min(...cards.map((box) => box.left)) - ring,
      right: Math.max(...cards.map((box) => box.right)) + ring,
      top: Math.min(...cards.map((box) => box.top)) - ring,
      bottom: Math.max(...cards.map((box) => box.bottom)) + ring
    }
    // The group's content clips, and so does its details' content slot,
    // whose box is the details' own beside and below the summary.
    const content = group.closest('[data-slot="accordion-content"]')!
    const details = group.closest('details')!
    const summary = details.querySelector('summary')!.getBoundingClientRect()
    const slot = getComputedStyle(details, '::details-content')
    const box = details.getBoundingClientRect()
    const clips = [
      content.getBoundingClientRect(),
      {
        left: box.left + parseFloat(slot.marginLeft),
        right: box.right - parseFloat(slot.marginRight),
        top:
          summary.bottom +
          parseFloat(getComputedStyle(details).rowGap) +
          parseFloat(slot.marginTop),
        bottom: box.bottom
      }
    ]
    for (const clip of clips) {
      expect(ringBox.left).toBeGreaterThanOrEqual(Math.floor(clip.left))
      expect(ringBox.right).toBeLessThanOrEqual(Math.ceil(clip.right))
      expect(ringBox.top).toBeGreaterThanOrEqual(Math.floor(clip.top))
      expect(ringBox.bottom).toBeLessThanOrEqual(Math.ceil(clip.bottom))
    }
  })

  it('collapses a group from its title, an inner one on its own, keeping it out of the view', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <RecordGrid
        data={testShows(6)}
        fields={groupedShowFields}
        getRowHref={(show: TestShow) => `/shows/${show.id}`}
        card={card}
        defaultView={{ layout: { type: 'grid', groupBy: ['status', 'city'] } }}
        onViewChange={onViewChange}
      />
    )
    const calls = onViewChange.mock.calls.length
    await user.click(disclosure('On sale 2'))
    const oceanAlley = screen.getByRole('link', {
      name: 'Ocean Alley 1',
      hidden: true
    })
    await expect.poll(() => shown(oceanAlley)).toBe(false)
    expect(
      screen.getByRole('link', { name: 'Ball Park Music 1' })
    ).toBeVisible()
    await user.click(disclosure('Melbourne 1'))
    const ballPark = screen.getByRole('link', {
      name: 'Ball Park Music 1',
      hidden: true
    })
    await expect.poll(() => shown(ballPark)).toBe(false)
    await user.click(disclosure('On sale 2'))
    await expect.poll(() => shown(oceanAlley)).toBe(true)
    expect(onViewChange.mock.calls.length).toBe(calls)
  })

  it('selects a Shift range in the order the groups show it, skipping a collapsed group', async () => {
    const user = userEvent.setup()
    render(
      <RecordGrid
        data={testShows(6)}
        fields={showFields}
        card={card}
        bulkActions={[{ label: 'Archive', onAction: () => {} }]}
        defaultView={grouped}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Select' }))
    await user.click(disclosure('Sold out 2'))
    const box = (name: string) => screen.getByRole('checkbox', { name })
    await user.click(box('Select Ocean Alley 1'))
    await user.keyboard('{Shift>}')
    await user.click(box('Select Julia Jacklin 1'))
    await user.keyboard('{/Shift}')
    const checked = (name: string) =>
      screen
        .getByRole('checkbox', { name: `Select ${name}`, hidden: true })
        .getAttribute('aria-checked')
    await expect.poll(() => checked('Julia Jacklin 1')).toBe('true')
    expect(checked('angie McMahon 1')).toBe('true')
    // Sold out sits between them, collapsed.
    expect(checked('Ball Park Music 1')).toBe('false')
    expect(checked('Alex Lahey 1')).toBe('false')
  })

  it('renders every card on its page when grouped, past the point a grid windows', () => {
    const { container } = render(
      <RecordGrid
        data={testShows(150)}
        fields={showFields}
        defaultPosition={{ pageSize: 150 }}
        maxHeight='600px'
        card={card}
        defaultView={grouped}
      />
    )
    expect(cardsIn(container)).toHaveLength(150)
  })

  it('stays ungrouped when it loads ranges', async () => {
    const { container } = render(
      <RecordGrid
        fields={showFields}
        maxHeight='600px'
        card={card}
        defaultView={grouped}
        loadRange={async ({ start, end }) => ({
          rows: testShows(end).slice(start),
          rowCount: 40
        })}
      />
    )
    await expect.poll(() => cardsIn(container).length).toBeGreaterThan(0)
    expect(container.querySelector('[data-slot="list-group"]')).toBeNull()
  })

  it('groups from Group by and Then by, keeping the card fields, and keeps grouping as the fields change', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <RecordGrid
        data={testShows(4)}
        fields={groupedShowFields}
        card={card}
        defaultView={{ layout: { type: 'grid', fields: ['sold'] } }}
        onViewChange={onViewChange}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Configure grid' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure grid' })
    await pickOption(user, {
      from: await within(panel).findByRole(
        'combobox',
        { name: 'Group by' },
        { timeout: 5000 }
      ),
      option: 'Status'
    })
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'grid',
      fields: ['sold'],
      groupBy: ['status']
    })
    await pickOption(user, { from: { panel, name: 'Then by' }, option: 'City' })
    expect(onViewChange.mock.lastCall![0].layout.groupBy).toEqual([
      'status',
      'city'
    ])
    await expect
      .poll(() => screen.queryAllByRole('heading', { level: 3 }).length)
      .toBeGreaterThan(0)
    await user.click(within(panel).getByRole('button', { name: 'Show Gross' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'grid',
      fields: ['sold', 'gross'],
      groupBy: ['status', 'city']
    })
  })
})
