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
import { userEvent as browserUser } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { groupedShowFields, testShows } from '../Records/testUtils'
import type { RecordsField } from '../Records/types'
import { type Move, Shows, cell, cellTitles, lane } from './boardTestUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await releaseDragPointer()
  window.scrollTo(0, 0)
})

// Ocean Alley on sale in Brisbane, Ball Park Music sold out in Melbourne,
// Julia Jacklin cancelled in Sydney, angie McMahon on sale in Perth, and Alex
// Lahey sold out in no city.
const shows = testShows(5).map((show, index) =>
  index === 4 ? { ...show, city: '' } : show
)

const Lanes = (props: Parameters<typeof Shows>[0]) => (
  <Shows
    shows={shows}
    fields={groupedShowFields}
    groupBy={['status', 'city']}
    {...props}
  />
)

const lanes = () =>
  [...document.querySelectorAll('[data-slot="record-board-lane"]')].map(
    (section) => section.getAttribute('aria-label')
  )
const disclosure = (name: string) =>
  within(lane(name)).getByRole('heading').closest('summary')!
const shown = (element: Element) => element.checkVisibility()
const moveTo = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string
) => {
  await user.click(
    screen.getByRole('button', { name: 'Reorder Ocean Alley 1' })
  )
  await user.click(
    await screen.findByRole('menuitem', {
      name: `Move Ocean Alley 1 to ${name}`
    })
  )
}

describe('boardLayout with lanes in a browser', { timeout: 30_000 }, () => {
  it('draws a lane per option of the second level, in option order, then "No city", empty ones too', () => {
    render(<Lanes />)
    expect(lanes()).toEqual([
      'Brisbane',
      'Melbourne',
      'Sydney',
      'Perth',
      'Hobart',
      'No city'
    ])
    expect(
      within(lane('Hobart'))
        .getAllByRole('group')
        // The lane's disclosure is an unnamed group around them.
        .flatMap((group) => group.getAttribute('aria-label') ?? [])
    ).toEqual(['On sale', 'Sold out', 'Cancelled', 'No status'])
  })

  it('puts each card in its lane and column', () => {
    render(<Lanes />)
    expect(cellTitles('Brisbane', 'On sale')).toEqual(['Ocean Alley 1'])
    expect(cellTitles('Brisbane', 'Sold out')).toEqual([])
    expect(cellTitles('Melbourne', 'Sold out')).toEqual(['Ball Park Music 1'])
    expect(cellTitles('Perth', 'On sale')).toEqual(['angie McMahon 1'])
    expect(cellTitles('No city', 'Sold out')).toEqual(['Alex Lahey 1'])
    expect(cellTitles('Hobart', 'On sale')).toEqual([])
  })

  it('draws one lane of columns when the view groups by one field', () => {
    render(
      <Lanes defaultView={{ layout: { type: 'board', groupBy: ['status'] } }} />
    )
    expect(lanes()).toEqual([])
    expect(screen.getByRole('region', { name: 'Sold out' })).toBeVisible()
  })

  it('keeps the column headers in view, over their columns, as the lanes scroll', () => {
    render(<Lanes shows={testShows(60)} />)
    const head = document.querySelector<HTMLElement>(
      '[data-slot="record-board-head"]'
    )!
    const header = within(head).getByText('Cancelled')
    window.scrollTo(0, 600)
    expect(window.scrollY).toBe(600)
    expect(head.getBoundingClientRect().top).toBeCloseTo(0, 0)
    const below = cell('Hobart', 'Cancelled').getBoundingClientRect()
    expect(below.top).toBeGreaterThan(head.getBoundingClientRect().bottom)
    expect(header.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      below.left
    )
    expect(header.getBoundingClientRect().left).toBeLessThan(below.left + 16)
  })

  it('collapses a lane from its title, hiding its cards and keeping it out of the view', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(<Lanes onViewChange={onViewChange} />)
    const calls = onViewChange.mock.calls.length
    const card = screen.getByRole('button', { name: 'Reorder Ocean Alley 1' })
    expect(card).toBeVisible()
    await user.click(disclosure('Brisbane'))
    await expect.poll(() => shown(card)).toBe(false)
    expect(
      screen.getByRole('button', { name: 'Reorder Ball Park Music 1' })
    ).toBeVisible()
    expect(onViewChange.mock.calls.length).toBe(calls)
    await user.click(disclosure('Brisbane'))
    await expect.poll(() => shown(card)).toBe(true)
  })

  it("draws a lane title's focus ring whole, clear of the sideways scroller", async () => {
    render(<Lanes />)
    const summary = disclosure('Brisbane')
    summary.focus({ focusVisible: true })
    expect(summary.matches(':focus-visible')).toBe(true)
    // The ring is the summary's outline, or its overlay's.
    const ring = () =>
      [undefined, '::after']
        .map((pseudo) => getComputedStyle(summary, pseudo))
        .map((style) => ({
          width:
            style.outlineStyle === 'none' ? 0 : parseFloat(style.outlineWidth),
          offset: parseFloat(style.outlineOffset) || 0
        }))
        .find(({ width }) => width > 0)
    await expect.poll(() => ring()?.width ?? 0).toBeGreaterThan(1)
    const { width, offset } = ring()!
    const reach = width + offset
    const box = summary.getBoundingClientRect()
    const clip = summary
      .closest('[data-slot="record-board-lanes"]')!
      .getBoundingClientRect()
    expect(box.left - reach).toBeGreaterThanOrEqual(Math.floor(clip.left))
    expect(box.right + reach).toBeLessThanOrEqual(Math.ceil(clip.right))
    expect(box.top - reach).toBeGreaterThanOrEqual(Math.floor(clip.top))
  })

  it('keeps a lane collapsed as its records change', async () => {
    const user = userEvent.setup()
    render(<Lanes />)
    await user.click(disclosure('Melbourne'))
    await moveTo(user, 'Cancelled')
    await expect
      .poll(() => cellTitles('Brisbane', 'Cancelled'))
      .toEqual(['Ocean Alley 1'])
    expect(disclosure('Melbourne').closest('details')!.open).toBe(false)
    expect(disclosure('Brisbane').closest('details')!.open).toBe(true)
  })

  it.each([
    [
      [],
      [
        'Ocean Alley 1',
        'Ball Park Music 1',
        'Julia Jacklin 1',
        'angie McMahon 1'
      ]
    ],
    [['Melbourne'], ['Ocean Alley 1', 'Julia Jacklin 1', 'angie McMahon 1']]
  ])(
    'selects a Shift range lane by open lane, with %j collapsed',
    async (collapsed, range) => {
      const user = userEvent.setup()
      render(<Lanes selected={['show-4']} />)
      for (const name of collapsed) await user.click(disclosure(name))
      await user.click(
        screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
      )
      await user.keyboard('{Shift>}')
      await user.click(
        screen.getByRole('checkbox', { name: 'Select angie McMahon 1' })
      )
      await user.keyboard('{/Shift}')
      const names = shows.map(({ show }) => show)
      // A collapsed lane's boxes are hidden, not gone.
      const checked = (name: string) => {
        const box = screen.getByRole('checkbox', {
          name: `Select ${name}`,
          hidden: true
        })
        return (
          box.getAttribute('aria-checked') === 'true' ||
          (box as HTMLInputElement).checked === true
        )
      }
      expect(names.filter(checked)).toEqual(
        names.filter((name) => [...range, 'Alex Lahey 1'].includes(name))
      )
    }
  )

  it("shows the lane field's heading content in each lane", () => {
    const fields = groupedShowFields.map((field): RecordsField =>
      field.key === 'city'
        ? {
            ...field,
            groupHeading: ({ value, count }) => (
              <span>{`${value ?? 'Nowhere'} venues, ${count} shows`}</span>
            )
          }
        : field
    )
    render(<Lanes fields={fields} />)
    expect(
      within(lane('Brisbane')).getByText('Brisbane venues, 1 shows')
    ).toBeVisible()
    expect(
      within(lane('Hobart')).getByText('Hobart venues, 0 shows')
    ).toBeVisible()
    expect(
      within(lane('No city')).getByText('Nowhere venues, 1 shows')
    ).toBeVisible()
  })

  it('moves a card to another column in its lane from its Move menu, with only the column field in the changes', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn<Move>()
    render(<Lanes onMove={onMove} />)
    await user.click(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' })
    )
    expect(
      (
        await screen.findAllByRole('menuitem', {
          name: /^Move Ocean Alley 1 to (?!top|bottom)/
        })
      ).map((item) => item.textContent)
    ).toEqual([
      'Move Ocean Alley 1 to Sold out',
      'Move Ocean Alley 1 to Cancelled',
      'Move Ocean Alley 1 to No status'
    ])
    await user.click(
      screen.getByRole('menuitem', { name: 'Move Ocean Alley 1 to Cancelled' })
    )
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: 'cancelled' }
    )
    await expect
      .poll(() => cellTitles('Brisbane', 'Cancelled'))
      .toEqual(['Ocean Alley 1'])
    expect(cellTitles('Brisbane', 'On sale')).toEqual([])
  })

  it('drags a card to another column in its lane', async () => {
    const onMove = vi.fn<Move>()
    render(<Lanes onMove={onMove} />)
    await browserUser.dragAndDrop(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      cell('Brisbane', 'No status').querySelector(
        '[data-slot="sortable-drop-zone"]'
      )!
    )
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: null }
    )
    await expect
      .poll(() => cellTitles('Brisbane', 'No status'))
      .toEqual(['Ocean Alley 1'])
  })

  it('scrolls the columns sideways on a phone, each lane a section inside every column', () => {
    render(<Lanes width={375} />)
    const first = cell('Brisbane', 'On sale').getBoundingClientRect()
    const second = cell('Brisbane', 'Sold out').getBoundingClientRect()
    expect(first.width / 375).toBeGreaterThan(0.75)
    expect(first.width / 375).toBeLessThan(0.9)
    expect(second.left).toBeLessThan(375)
    const below = cell('Melbourne', 'On sale').getBoundingClientRect()
    expect(below.left).toBeCloseTo(first.left, 0)
    expect(below.top).toBeGreaterThan(first.bottom)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth
    )
  })

  it('keeps lane titles and column headers in step as a phone scrolls sideways', async () => {
    render(<Lanes width={375} />)
    const scroller = cell('Brisbane', 'On sale').closest<HTMLElement>(
      '[data-slot="record-board-lanes"]'
    )!
    scroller.scrollLeft = cell('Brisbane', 'Cancelled').offsetLeft
    const column = cell('Brisbane', 'Cancelled')
    const header = within(
      document.querySelector<HTMLElement>('[data-slot="record-board-head"]')!
    ).getByText('Cancelled')
    await expect
      .poll(() =>
        Math.abs(
          header.getBoundingClientRect().left -
            column.getBoundingClientRect().left
        )
      )
      .toBeLessThan(16)
    const title = within(lane('Brisbane')).getByRole('heading')
    expect(title.getBoundingClientRect().left).toBeGreaterThanOrEqual(0)
    expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(375)
  })
})
