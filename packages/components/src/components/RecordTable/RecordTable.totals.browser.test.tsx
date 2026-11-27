import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import {
  loadBrandFont,
  useStylesheet
} from '@oztix/roadie-browser-testing/stylesheet'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import type { RecordsBulkAction } from '../Records'
import { showFields, testShows } from '../Records/testUtils'
import { ALL, frame, rect, slot, wideColumns } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const actions: RecordsBulkAction[] = [{ label: 'Export', onAction: () => {} }]
const near = (a: number, b: number) => Math.abs(a - b) <= 1

type Mode = 'pane' | 'maxHeight'

function Shows({ mode, width = 660 }: { mode: Mode; width?: number }) {
  const table = (
    <RecordTable
      caption='Shows'
      data={testShows(400)}
      fields={showFields}
      columns={wideColumns}
      defaultPosition={ALL}
      bulkActions={actions}
      recordName={{ one: 'show', other: 'shows' }}
      totals
      maxHeight={mode === 'maxHeight' ? '20rem' : undefined}
    />
  )
  if (mode === 'maxHeight') return <div style={{ width }}>{table}</div>
  return (
    <div style={{ height: 600, width: width + 100, display: 'grid' }}>
      <Pane>
        <Pane.Header>
          <Pane.Title>Shows</Pane.Title>
        </Pane.Header>
        <Pane.Body>{table}</Pane.Body>
      </Pane>
    </div>
  )
}

function scrollers(container: HTMLElement, mode: Mode) {
  if (mode === 'pane')
    return {
      down: slot(container, 'pane-viewport'),
      sideways: slot(container, 'record-table-scroller')
    }
  const viewport = slot(container, 'record-table-viewport')
  return { down: viewport, sideways: viewport }
}

/** Each totals cell's edges against the first record's cells, column by column. */
function misaligned(container: HTMLElement) {
  const totals = [...slot(container, 'record-table-totals').children]
  const record = [...slot(container, 'record-table-row').children]
  return totals.flatMap((cell, index) => {
    const a = rect(cell)
    const b = rect(record[index]!)
    return near(a.left, b.left) && near(a.right, b.right) ? [] : [index]
  })
}

async function scroll(container: HTMLElement, mode: Mode) {
  const { down, sideways } = scrollers(container, mode)
  await expect
    .poll(() => {
      down.scrollTop = 1500
      sideways.scrollLeft = 200
      return down.scrollTop > 0 && sideways.scrollLeft > 0
    })
    .toBe(true)
  await frame()
  await frame()
}

describe('RecordTable totals', () => {
  for (const mode of ['pane', 'maxHeight'] as const) {
    it(`sits under the headings and stays there while the rows scroll (${mode})`, async () => {
      const { container } = render(<Shows mode={mode} />)
      await frame()
      const headRow = slot(container, 'record-table-head-row')
      const totals = slot(container, 'record-table-totals')
      expect(near(rect(totals).top, rect(headRow).bottom)).toBe(true)
      await scroll(container, mode)
      expect(near(rect(totals).top, rect(headRow).bottom)).toBe(true)
      expect(rect(slot(container, 'record-table-row')).top).toBeLessThan(
        rect(headRow).top
      )
      expect(rect(slot(container, 'record-table-head')).height).toBe(
        rect(headRow).height + rect(totals).height
      )
    })

    it(`lines up with the columns when scrolled sideways, and under the bulk bar (${mode})`, async () => {
      const { container } = render(<Shows mode={mode} />)
      await frame()
      await scroll(container, mode)
      expect(misaligned(container)).toEqual([])
      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
      )
      await expect
        .poll(() => screen.queryByRole('toolbar', { name: 'Bulk actions' }))
        .not.toBeNull()
      await frame()
      expect(misaligned(container)).toEqual([])
      expect(
        screen.getByRole('rowheader', { name: 'Totals for 400 shows' })
      ).toBeVisible()
    })
  }

  it('scrolls sideways with the columns while the bulk bar shows', async () => {
    const { container } = render(<Shows mode='pane' />)
    await frame()
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await expect
      .poll(() => screen.queryByRole('toolbar', { name: 'Bulk actions' }))
      .not.toBeNull()
    await scroll(container, 'pane')
    expect(misaligned(container)).toEqual([])
  })

  it('sticks the head under the toolbar, under the pane header, with the bar shown', async () => {
    const { container } = render(<Shows mode='pane' />)
    await frame()
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await expect
      .poll(() => screen.queryByRole('toolbar', { name: 'Bulk actions' }))
      .not.toBeNull()
    // The pane header collapses as it scrolls, over a slow transition.
    await expect
      .poll(
        () => {
          slot(container, 'pane-viewport').scrollTop = 1500
          const header = slot(container, 'pane-header')
          const toolbar = rect(slot(container, 'records-header'))
          const head = rect(slot(container, 'record-table-head'))
          // abs: toEqual tells -0 from 0.
          return [
            header.dataset.collapsed,
            ...[
              toolbar.top - rect(header).bottom,
              head.top - toolbar.bottom
            ].map((gap) => Math.abs(Math.round(gap)))
          ]
        },
        { timeout: 5000 }
      )
      .toEqual(['true', 0, 0])
  })

  it('leaves room above the bulk bar for its focus rings', async () => {
    const { container } = render(<Shows mode='pane' />)
    await frame()
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await expect
      .poll(() => screen.queryByRole('toolbar', { name: 'Bulk actions' }))
      .not.toBeNull()
    const first = screen
      .getByRole('toolbar', { name: 'Bulk actions' })
      .querySelector('button')!
    // The ring's full reach: a 2px offset and a 2px ring.
    const ringTop = rect(first).top - 4
    const frameElement = slot(container, 'record-table-frame')
    const clippers = []
    for (let el = first.parentElement; el && el !== frameElement;) {
      if (getComputedStyle(el).overflowY !== 'visible') clippers.push(el)
      el = el.parentElement
    }
    expect(
      clippers
        .filter((el) => rect(el).top > ringTop)
        .map((el) => el.dataset.slot)
    ).toEqual([])
  })

  it('starts the box scrollbar under the totals', async () => {
    const { container } = render(<Shows mode='maxHeight' />)
    await frame()
    const scrollbar = slot(container, 'record-table-scrollbar')
    expect(
      near(
        rect(scrollbar).top,
        rect(slot(container, 'record-table-totals')).bottom
      )
    ).toBe(true)
  })

  for (const selectable of [false, true])
    it(`re-flows into one wrapping line above the rows at 360px${selectable ? ', selectable' : ''}`, async () => {
      const { container } = render(
        <div style={{ width: 360 }}>
          <RecordTable
            caption='Shows'
            data={testShows(40)}
            fields={showFields}
            columns={wideColumns}
            recordName={{ one: 'show', other: 'shows' }}
            selectable={selectable}
            totals
          />
        </div>
      )
      await frame()
      expect(
        slot(container, 'record-table-frame').hasAttribute('data-narrow')
      ).toBe(false)
      const totals = slot(container, 'record-table-totals')
      expect(totals.getAttribute('role')).toBe('row')
      expect(
        screen.getByRole('rowheader', { name: 'Totals for 40 shows' })
      ).toBeVisible()
      // In reading order on screen: the label, then each total by its heading.
      const shown = [...totals.children]
        .filter((cell) => getComputedStyle(cell).display !== 'none')
        .map((cell) => ({
          box: rect(cell),
          text: (cell as HTMLElement).innerText
        }))
        .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left)
        .map(({ text }) => text.replace(/\s+/g, ' ').trim())
      expect(shown).toEqual([
        'Totals for 40 shows',
        expect.stringMatching(/^Sold [\d,]+$/),
        expect.stringMatching(/^Gross \$\S+$/)
      ])
      // Sold's header hides with its column, so the total reads its own heading.
      expect(screen.getByRole('cell', { name: /^Sold [\d,]+$/ })).toBeVisible()
      expect(totals.scrollWidth).toBeLessThanOrEqual(totals.clientWidth)
      expect(rect(totals).right).toBeLessThanOrEqual(
        rect(slot(container, 'record-table-frame')).right + 1
      )
      expect(rect(totals).bottom).toBeLessThanOrEqual(
        rect(slot(container, 'record-table-row')).top + 1
      )
    })
})
