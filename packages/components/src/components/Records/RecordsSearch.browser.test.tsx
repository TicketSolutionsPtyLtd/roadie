import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { settledBox } from '../../utils/touchTestUtils'
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

  it('opens Custom dates for a date chip under it, with a date picker inside', async () => {
    render(
      <Shows
        defaultView={{
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-weekend' }
            ]
          }
        }}
      />
    )
    const starts = chip('Starts')
    await userEvent.click(
      within(starts).getByRole('button', { name: /^Starts/ })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Custom dates' })
    )
    const dialog = await screen.findByRole('dialog', { name: 'Starts' })
    const editor = await settledBox(dialog)
    expect(editor.top).toBeGreaterThan(box(starts).bottom)
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Choose dates/ })
    )
    await userEvent.click(
      await screen.findByRole('button', { name: /^Next week/ })
    )
    await expect.poll(() => chip('Starts')?.textContent).toContain('Next week')
    const after = screen.getByRole('dialog', { name: 'Starts' })
    expect(after).toBeVisible()
    // The edited chip remounts; the editor stays under the chip that holds it.
    const moved = await settledBox(after)
    expect(moved.top).toBeGreaterThan(box(chip('Starts')).bottom)
    expect(Math.abs(moved.left - box(chip('Starts')).left)).toBeLessThan(2)
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    await userEvent.click(
      within(chip('Starts')).getByRole('button', { name: /^Starts/ })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Custom dates' })
    )
    const reopened = await settledBox(
      await screen.findByRole('dialog', { name: 'Starts' })
    )
    expect(reopened.top).toBeGreaterThan(box(chip('Starts')).bottom)
  })

  it('keeps Tab inside Custom dates, titled with its field', async () => {
    render(
      <Shows
        defaultView={{
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-weekend' }
            ]
          }
        }}
      />
    )
    await userEvent.click(
      within(chip('Starts')).getByRole('button', { name: /^Starts/ })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Custom dates' })
    )
    const dialog = await screen.findByRole('dialog', { name: 'Starts' })
    await expect
      .element(within(dialog).getByRole('heading', { name: 'Starts' }))
      .toBeVisible()
    await expect.poll(() => dialog.contains(document.activeElement)).toBe(true)
    const stops = new Set<Element | null>()
    for (let press = 0; press < 6; press++) {
      await userEvent.keyboard('{Tab}')
      // A focus guard at the edge hands focus on a moment later.
      await expect
        .poll(() => document.activeElement?.closest('[role=dialog]'))
        .toBe(dialog)
      stops.add(document.activeElement)
    }
    expect(stops.size).toBeGreaterThan(1)
    expect(dialog).toBeVisible()
  })

  it('leaves the page scrolling under Custom dates, and a click on another chip closes it and edits that chip', async () => {
    render(
      <Shows
        defaultView={{
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-weekend' },
              { field: 'city', operator: 'contains', value: 'Perth' }
            ]
          }
        }}
      />
    )
    await userEvent.click(
      within(chip('Starts')).getByRole('button', { name: /^Starts/ })
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Custom dates' })
    )
    await screen.findByRole('dialog', { name: 'Starts' })
    // The page still scrolls behind it.
    for (const element of [document.documentElement, document.body])
      expect(getComputedStyle(element).overflow).not.toBe('hidden')
    // By selector, as the dialog hides the page from the accessibility tree.
    await userEvent.click(chip('City').querySelector('button')!)
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    await expect
      .poll(() => chip('City').hasAttribute('data-selected'))
      .toBe(true)
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

// Prototype (INNO-1278): goes with whichever Custom dates surface loses.
describe(
  'Records.Search with Custom dates in the dropdown on a phone',
  TIMEOUT,
  () => {
    const popup = () =>
      document.querySelector<HTMLElement>('[data-slot=combobox-popup]')
    const day = (date: string) =>
      popup()!.querySelector<HTMLElement>(`button[data-date="${date}"]`)!

    async function openCalendar(defaultView?: RecordViewDefaults) {
      await page.viewport(390, 844)
      render(
        <div data-custom-dates='inline'>
          <Shows defaultView={defaultView} />
        </div>
      )
      await userEvent.click(
        screen.getByRole('combobox', { name: 'Search and filter' })
      )
      await userEvent.click(
        await screen.findByRole('option', { name: /^Starts/ })
      )
      await userEvent.click(
        await screen.findByRole('option', { name: 'Custom dates' })
      )
      await expect
        .poll(() => popup()?.querySelector('[data-slot=records-dates-panel]'))
        .toBeTruthy()
    }

    it('shows the calendar in the dropdown, focused, with no drawer', async () => {
      await openCalendar()
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.queryByRole('listbox')).toBeNull()
      expect(
        within(popup()!).getByRole('group', { name: 'Starts condition' })
      ).toBeVisible()
      await expect
        .poll(() => popup()!.contains(document.activeElement))
        .toBe(true)
      expect(
        document.activeElement?.closest('[data-slot=calendar]')
      ).toBeTruthy()
    })

    it('returns to the quick dates with Back, and with Escape', async () => {
      await openCalendar()
      await userEvent.click(
        within(popup()!).getByRole('button', { name: 'Back' })
      )
      await expect
        .element(await screen.findByRole('option', { name: 'Custom dates' }))
        .toBeVisible()
      expect(document.activeElement).toBe(
        screen.getByRole('combobox', { name: 'Search and filter' })
      )
      await userEvent.click(
        screen.getByRole('option', { name: 'Custom dates' })
      )
      await expect
        .poll(() => popup()?.querySelector('[data-slot=records-dates-panel]'))
        .toBeTruthy()
      await userEvent.keyboard('{Escape}')
      await expect
        .element(await screen.findByRole('option', { name: 'Custom dates' }))
        .toBeVisible()
    })

    it('adds the chip from a picked range and ends the step', async () => {
      await openCalendar()
      await userEvent.click(day('2026-10-10'))
      await userEvent.click(day('2026-10-12'))
      await expect.poll(() => chip('Starts')?.textContent).toContain('10')
      await expect.poll(popup).toBeNull()
      expect(
        document.querySelector('[data-slot=query-field-pending-chip]')
      ).toBeNull()
      expect(document.activeElement).toBe(chip('Starts'))
    })

    it('changes a chip to one date under another condition', async () => {
      await page.viewport(390, 844)
      render(
        <div data-custom-dates='inline'>
          <Shows
            defaultView={{
              query: {
                filters: [
                  { field: 'starts', operator: 'within', value: 'this-weekend' }
                ]
              }
            }}
          />
        </div>
      )
      await userEvent.click(
        within(chip('Starts')).getByRole('button', { name: /^Starts/ })
      )
      await userEvent.click(
        await screen.findByRole('option', { name: 'Custom dates' })
      )
      await expect
        .poll(() => popup()?.querySelector('[data-slot=records-dates-panel]'))
        .toBeTruthy()
      await userEvent.click(
        within(popup()!).getByRole('button', { name: 'After' })
      )
      await userEvent.click(day('2026-10-20'))
      await expect.poll(() => chip('Starts')?.textContent).toMatch(/after/i)
      expect(
        document.querySelectorAll('[data-slot=combobox-chip]')
      ).toHaveLength(1)
      await expect.poll(popup).toBeNull()
    })

    it('keeps the drawer on a phone outside the comparison', async () => {
      await page.viewport(390, 844)
      render(<Shows />)
      await userEvent.click(
        screen.getByRole('combobox', { name: 'Search and filter' })
      )
      await userEvent.click(
        await screen.findByRole('option', { name: /^Starts/ })
      )
      await userEvent.click(
        await screen.findByRole('option', { name: 'Custom dates' })
      )
      await screen.findByRole('dialog', { name: 'Starts' })
      expect(
        document.querySelector('[data-slot=records-dates-panel]')
      ).toBeNull()
    })
  }
)
