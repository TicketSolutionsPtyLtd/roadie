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

import {
  pickMenuItem,
  waitPopupGone,
  withFrames
} from '@oztix/roadie-browser-testing'
import {
  loadBrandFont,
  useStylesheet
} from '@oztix/roadie-browser-testing/stylesheet'

import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
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
const moveTo = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  pickMenuItem(user, {
    from: screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
    item: `Move Ocean Alley 1 to ${name}`
  })

// By keyboard, as a pointer that jumps straight into a submenu meets the
// parent menu's hover guard.
const arrowTo = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string
) => {
  for (let step = 0; step < 15; step++) {
    if (document.activeElement?.textContent === name) return
    await user.keyboard('{ArrowDown}')
  }
  expect(document.activeElement?.textContent).toBe(name)
}
const moveAcross = async (
  user: ReturnType<typeof userEvent.setup>,
  laneName: string,
  columnName: string
) => {
  screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }).focus()
  await user.keyboard('{Enter}')
  const menu = await withFrames(() => screen.findByRole('menu'))
  await arrowTo(user, `Move Ocean Alley 1 to ${laneName}`)
  await user.keyboard('{ArrowRight}')
  // The submenu opens and takes focus in a frame.
  await withFrames(() =>
    expect
      .poll(() => document.activeElement?.closest('[role="menu"]'))
      .not.toBe(menu)
  )
  await arrowTo(user, `Move Ocean Alley 1 to ${columnName} in ${laneName}`)
  await user.keyboard('{Enter}')
  await waitPopupGone('menu')
}
const announced = () =>
  screen.getAllByRole('status').map((status) => status.textContent)

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
      'Move Ocean Alley 1 to No status',
      // Each other lane opens its columns.
      'Move Ocean Alley 1 to Melbourne',
      'Move Ocean Alley 1 to Sydney',
      'Move Ocean Alley 1 to Perth',
      'Move Ocean Alley 1 to Hobart',
      'Move Ocean Alley 1 to No city'
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

  it.each([
    [
      'the same column in another lane',
      'Melbourne',
      'On sale',
      { city: 'Melbourne' }
    ],
    [
      'another column in another lane',
      'Melbourne',
      'Cancelled',
      { status: 'cancelled', city: 'Melbourne' }
    ],
    [
      '"No status" in "No city"',
      'No city',
      'No status',
      { status: null, city: null }
    ]
  ])(
    'drags a card to %s, with each changed field',
    async (_, laneName, columnName, changes) => {
      const onMove = vi.fn<Move>()
      render(<Lanes onMove={onMove} />)
      await browserUser.dragAndDrop(
        screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
        cell(laneName, columnName).querySelector(
          '[data-slot="sortable-drop-zone"]'
        )!
      )
      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'show-0' }),
        changes
      )
      await expect
        .poll(() => cellTitles(laneName, columnName))
        .toContain('Ocean Alley 1')
      expect(cellTitles('Brisbane', 'On sale')).toEqual([])
    }
  )

  it('moves a card to a column in another lane from its Move menu by keyboard', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn<Move>()
    render(<Lanes onMove={onMove} />)
    screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }).focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await arrowTo(user, 'Move Ocean Alley 1 to Melbourne')
    await user.keyboard('{ArrowRight}')
    await expect
      .poll(() => document.activeElement?.textContent)
      .toBe('Move Ocean Alley 1 to On sale in Melbourne')
    expect(
      within(screen.getAllByRole('menu')[1]!)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual([
      'Move Ocean Alley 1 to On sale in Melbourne',
      'Move Ocean Alley 1 to Sold out in Melbourne',
      'Move Ocean Alley 1 to Cancelled in Melbourne',
      'Move Ocean Alley 1 to No status in Melbourne'
    ])
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: 'sold_out', city: 'Melbourne' }
    )
    await expect
      .poll(() => cellTitles('Melbourne', 'Sold out'))
      .toContain('Ocean Alley 1')
    expect(cellTitles('Brisbane', 'On sale')).toEqual([])
    await expect
      .poll(() => screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }))
      .toHaveFocus()
    await expect
      .poll(announced)
      .toContain('Ocean Alley 1 moved to position 2 of 2 Sold out in Melbourne')
  })

  it('moves a card to a column in another lane from its Move menu by pointer', async () => {
    const onMove = vi.fn<Move>()
    render(<Lanes onMove={onMove} />)
    await browserUser.click(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' })
    )
    await browserUser.hover(
      await screen.findByRole('menuitem', {
        name: 'Move Ocean Alley 1 to Melbourne'
      })
    )
    await browserUser.click(
      // A hover wakes the frames that open the submenu, and the helper's
      // corner wiggle would move the pointer off its trigger and close it.
      // eslint-disable-next-line roadie/no-unwaited-popup-pick
      await screen.findByRole('menuitem', {
        name: 'Move Ocean Alley 1 to Cancelled in Melbourne'
      })
    )
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: 'cancelled', city: 'Melbourne' }
    )
    await expect
      .poll(() => cellTitles('Melbourne', 'Cancelled'))
      .toContain('Ocean Alley 1')
  })

  it('keeps a move the app is still saving when the card moves again', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn<Move>(() => new Promise(() => {}))
    render(<Lanes onMove={onMove} />)
    await moveTo(user, 'Cancelled')
    await expect
      .poll(() => cellTitles('Brisbane', 'Cancelled'))
      .toEqual(['Ocean Alley 1'])
    await moveAcross(user, 'Melbourne', 'Cancelled')
    expect(onMove).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { city: 'Melbourne' }
    )
    await expect
      .poll(() => cellTitles('Melbourne', 'Cancelled'))
      .toEqual(['Ocean Alley 1'])
    expect(cellTitles('Melbourne', 'On sale')).toEqual([])
  })

  it('puts a card moved to another lane back, with the message, when onMove rejects', async () => {
    const user = userEvent.setup()
    let reject = (_: Error) => {}
    render(
      <Lanes
        onMove={() =>
          new Promise((_, fail) => {
            reject = fail
          })
        }
      />
    )
    await moveAcross(user, 'Melbourne', 'Cancelled')
    // Shown in its new lane and column while the app saves it.
    await expect
      .poll(() => cellTitles('Melbourne', 'Cancelled'))
      .toEqual(['Ocean Alley 1'])
    reject(new Error('Shows can’t change city.'))
    await expect
      .poll(() => cellTitles('Brisbane', 'On sale'))
      .toEqual(['Ocean Alley 1'])
    expect(cellTitles('Melbourne', 'Cancelled')).toEqual([])
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Shows can’t change city.'
    )
  })

  it('moves a card into a collapsed lane from its Move menu, leaving the lane collapsed and saying where the card went', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn<Move>()
    render(<Lanes onMove={onMove} />)
    await user.click(disclosure('Melbourne'))
    await moveAcross(user, 'Melbourne', 'Cancelled')
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: 'cancelled', city: 'Melbourne' }
    )
    await expect
      .poll(() => within(lane('Melbourne')).queryByText('Ocean Alley 1'))
      .not.toBeNull()
    expect(cellTitles('Brisbane', 'On sale')).toEqual([])
    expect(disclosure('Melbourne').closest('details')!.open).toBe(false)
    await expect
      .poll(announced)
      .toContain(
        'Ocean Alley 1 moved to position 1 of 1 Cancelled in Melbourne'
      )
    // The card is out of sight, so focus goes to the lane it joined.
    await expect.poll(() => disclosure('Melbourne')).toHaveFocus()
  })

  it.each([1100, 1600])(
    'shares %ipx between the columns, header and lanes alike',
    (width) => {
      render(<Lanes width={width} />)
      const scroller = document.querySelector<HTMLElement>(
        '[data-slot="record-board-lanes"]'
      )!
      expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth)
      const head = document.querySelector<HTMLElement>(
        '[data-slot="record-board-head"]'
      )!
      const bounds = scroller.getBoundingClientRect()
      const first = cell('Perth', 'On sale').getBoundingClientRect()
      const last = cell('Perth', 'No status').getBoundingClientRect()
      expect(first.left).toBeCloseTo(bounds.left, 0)
      expect(last.right).toBeCloseTo(bounds.right, 0)
      const header = within(head)
        .getByText('No status')
        .closest('p')!
        .getBoundingClientRect()
      expect(header.left).toBeCloseTo(last.left, 0)
      expect(header.width).toBeCloseTo(last.width, 0)
    }
  )

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
