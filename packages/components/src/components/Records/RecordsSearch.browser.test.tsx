import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { RecordTable, tableColumns } from '../RecordTable'
import { type TestShow, showFields, testShows } from './testUtils'
import type { RecordViewDefaults } from './types'

const STILL = '*, *::before, *::after { transition: none !important }'
const TIMEOUT = { timeout: 20_000 }

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
afterEach(async () => {
  cleanup()
  await page.viewport(1024, 768)
})

const column = tableColumns<TestShow>(showFields)
const columns = [
  column.field('show', { pin: true }),
  column.field('city'),
  column.field('status'),
  column.field('starts')
]

function Shows({ defaultView }: { defaultView?: RecordViewDefaults }) {
  return (
    <RecordTable
      caption='Shows'
      data={testShows(40)}
      fields={showFields}
      columns={columns}
      getRowId={(row) => row.id}
      defaultView={defaultView}
      timeZone='Australia/Sydney'
      now={new Date('2026-10-03T02:00:00Z')}
      tableActions={[{ label: 'Export CSV', onAction: () => {} }]}
    />
  )
}

const searchField = () =>
  screen
    .getByRole('combobox', { name: 'Search and filter' })
    .closest<HTMLElement>('[data-slot="query-field"]')!
const chip = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot=combobox-chip]')].find(
    (element) => element.textContent?.includes(label)
  )!
const box = (element: Element) => element.getBoundingClientRect()

const manyFilters: RecordViewDefaults = {
  query: {
    filters: [
      { field: 'status', operator: 'is', values: ['on_sale', 'sold_out'] },
      { field: 'sold', operator: 'gt', value: 100 },
      { field: 'gross', operator: 'between', value: [100, 250000] },
      { field: 'starts', operator: 'within', value: 'this-month' },
      { field: 'city', operator: 'contains', value: 'Perth' }
    ]
  }
}

describe('Records.Search in a browser', TIMEOUT, () => {
  it('keeps the toolbar buttons on the first row as chips wrap', async () => {
    await page.viewport(700, 768)
    render(<Shows defaultView={manyFilters} />)
    const field = searchField()
    expect(box(field).height).toBeGreaterThan(40)
    const configure = screen.getByRole('button', { name: 'Configure table' })
    expect(box(configure).top).toBe(box(field).top)
    expect(box(configure).height).toBe(40)
  })

  it('edits an option chip in the list on a phone', async () => {
    await page.viewport(390, 844)
    render(
      <Shows
        defaultView={{
          query: {
            filters: [{ field: 'status', operator: 'is', values: ['on_sale'] }]
          }
        }}
      />
    )
    await userEvent.click(
      within(chip('Status')).getByRole('button', { name: /^Status/ })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Sold out' })
    )
    await expect
      .poll(() => chip('Status')?.textContent)
      .toContain('On sale or Sold out')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('listbox')).toBeVisible()
  })

  it('edits a number chip in the list on a phone, its value in the field, then closes the list', async () => {
    await page.viewport(390, 844)
    render(
      <Shows
        defaultView={{
          query: { filters: [{ field: 'sold', operator: 'gt', value: 100 }] }
        }}
      />
    )
    await userEvent.click(
      within(chip('Sold')).getByRole('button', { name: /^Sold/ })
    )
    const field = screen.getByRole('combobox', { name: 'Search and filter' })
    await expect.element(field).toHaveValue('100')
    await userEvent.clear(field)
    await userEvent.type(field, '250')
    await userEvent.click(
      await screen.findByRole('option', { name: 'Sold is more than 250' })
    )
    await expect.poll(() => chip('Sold')?.textContent).toContain('250')
    expect(screen.queryByRole('dialog')).toBeNull()
    await expect.poll(() => screen.queryByRole('listbox')).toBeNull()
    expect(chip('Sold')).not.toHaveAttribute('data-selected')
  })
})

const popup = () =>
  document.querySelector<HTMLElement>('[data-slot=combobox-popup]')
const calendar = () =>
  popup()?.querySelector<HTMLElement>('[data-slot=calendar]') ?? null
const day = (date: string) =>
  calendar()!.querySelector<HTMLElement>(
    `button[data-date="${date}"]:not([data-outside])`
  )!
const operator = (name: string) =>
  within(screen.getByRole('group', { name: 'Operator' })).getByRole('button', {
    name
  })
const searchInput = () =>
  screen.getByRole('combobox', { name: 'Search and filter' })

describe.each([
  { name: 'a phone', width: 390, height: 844 },
  { name: 'a desktop', width: 1440, height: 900 }
])('Records.Search dates on $name', TIMEOUT, ({ width, height }) => {
  async function chooseStarts(defaultView?: RecordViewDefaults) {
    await page.viewport(width, height)
    render(<Shows defaultView={defaultView} />)
    await userEvent.click(searchInput())
    await userEvent.click(
      await screen.findByRole('option', { name: /^Starts/ })
    )
  }

  async function underCondition(name: string) {
    await chooseStarts()
    await userEvent.click(operator(name))
    await expect.poll(calendar).toBeTruthy()
  }

  afterEach(() => {
    // No popover or drawer: the dates stay in the dropdown.
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('starts on is relative, listing the quick dates', async () => {
    await chooseStarts()
    expect(operator('is relative')).toHaveAttribute('aria-pressed', 'true')
    await expect
      .element(await screen.findByRole('option', { name: /^This weekend/ }))
      .toBeVisible()
    expect(calendar()).toBeNull()
  })

  it('shows a calendar under is, its week inside the field’s width', async () => {
    await underCondition('is')
    expect(operator('is')).toHaveAttribute('aria-pressed', 'true')
    const field = box(searchField())
    const dropdown = box(popup()!)
    expect(dropdown.width).toBeLessThanOrEqual(field.width + 1)
    const sunday = box(day('2026-10-04'))
    expect(sunday.right).toBeLessThanOrEqual(dropdown.right)
    expect(box(day('2026-10-05')).left).toBeGreaterThanOrEqual(dropdown.left)
    expect(searchInput()).toHaveFocus()
  })

  it('shows two months side by side only where they fit', async () => {
    await underCondition('is')
    const months = () =>
      popup()!.querySelectorAll('[data-slot="calendar-month"]')
    await expect.poll(() => months().length).toBe(width > 768 ? 2 : 1)
    const [first, second] = [...months()].map(box)
    if (second) expect(second.top).toBe(first!.top)
    expect(box(popup()!).width).toBeLessThanOrEqual(
      box(searchField()).width + 1
    )
  })

  it('jumps months from the caption’s select, keeping the dropdown open', async () => {
    await underCondition('is')
    const month = popup()!.querySelector('select')!
    await userEvent.selectOptions(month, 'December')
    await expect.poll(() => day('2026-12-10')).toBeTruthy()
    expect(popup()).not.toBeNull()
    expect(searchInput()).toHaveFocus()
    await userEvent.click(day('2026-12-10'))
    await expect
      .poll(() => chip('Starts')?.textContent)
      .toContain('Starts is on Thu 10 Dec')
  })

  it('adds “is on” for a clicked day and closes the dropdown', async () => {
    await underCondition('is')
    await userEvent.click(day('2026-10-22'))
    await expect
      .poll(() => chip('Starts')?.textContent)
      .toContain('Starts is on Thu 22 Oct')
    await expect.poll(popup).toBeNull()
    expect(searchInput()).toHaveFocus()
  })

  it('adds a range from two clicks under is between', async () => {
    await underCondition('is between')
    await userEvent.click(day('2026-10-20'))
    expect(chip('Starts')).toBeUndefined()
    expect(calendar()).toBeTruthy()
    await userEvent.click(day('2026-10-23'))
    await expect
      .poll(() => chip('Starts')?.textContent)
      .toContain('Starts is 20 to 23 Oct')
    await expect.poll(popup).toBeNull()
  })

  it('offers a typed day under is, and Enter adds it', async () => {
    await underCondition('is')
    await userEvent.keyboard('fri')
    const friday = await screen.findByRole('option', { name: /^Fri/ })
    expect(
      friday.compareDocumentPosition(calendar()!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    await userEvent.keyboard('{Enter}')
    await expect
      .poll(() => chip('Starts')?.textContent)
      .toContain('Starts is on Fri 9 Oct')
  })

  it('opens a before chip on is before, its day marked', async () => {
    await page.viewport(width, height)
    render(
      <Shows
        defaultView={{
          query: {
            filters: [
              { field: 'starts', operator: 'before', value: '2026-11-12' }
            ]
          }
        }}
      />
    )
    await userEvent.click(
      within(chip('Starts')).getByRole('button', { name: /^Starts/ })
    )
    await expect.poll(calendar).toBeTruthy()
    expect(operator('is before')).toHaveAttribute('aria-pressed', 'true')
    expect(day('2026-11-12')).toHaveAttribute('data-selected')
    await userEvent.click(day('2026-11-20'))
    await expect
      .poll(() => chip('Starts')?.textContent)
      .toContain('Starts is before')
    expect(chip('Starts').textContent).toContain('20 Nov')
    expect(document.querySelectorAll('[data-slot=combobox-chip]')).toHaveLength(
      1
    )
  })
})

describe('Records.Search dates on a narrow toolbar', TIMEOUT, () => {
  it('keeps the search on the row while the calendar is pressed', async () => {
    await page.viewport(390, 844)
    render(<Shows />)
    await userEvent.click(searchInput())
    await userEvent.click(
      await screen.findByRole('option', { name: /^Starts/ })
    )
    await userEvent.click(operator('is after'))
    await expect.poll(calendar).toBeTruthy()
    const toolbar = document.querySelector('[data-slot=records-toolbar]')!
    expect(toolbar).toHaveAttribute('data-search-focused')
    await userEvent.click(
      within(calendar()!).getByRole('button', { name: /next month/i })
    )
    expect(searchInput()).toHaveFocus()
    expect(toolbar).toHaveAttribute('data-search-focused')
    expect(
      document.querySelector('[data-slot=query-field-pending-chip]')
    ).toHaveTextContent('Starts is after')
  })
})
