import { useEffect } from 'react'

import { act, cleanup, render, screen, within } from '@testing-library/react'
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

import { RecordTable, tableLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import {
  Records,
  type RecordsBulkAction,
  type RecordsInstance,
  useRecords
} from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { ALL, frame, rect, slot, wideColumns } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const actions: RecordsBulkAction[] = [
  { label: 'Export', onAction: () => {} },
  { label: 'Archive', onAction: () => {} }
]
const near = (a: number, b: number) => Math.abs(a - b) <= 1

type Mode = 'pane' | 'maxHeight' | 'fill'

function Shows({
  mode,
  width = 760,
  bulkActions = actions
}: {
  mode: Mode
  width?: number
  bulkActions?: RecordsBulkAction[]
}) {
  const table = (
    <RecordTable
      caption='Shows'
      data={testShows(400)}
      fields={showFields}
      columns={wideColumns}
      defaultPosition={ALL}
      bulkActions={bulkActions}
      maxHeight={mode === 'maxHeight' ? '20rem' : undefined}
      fill={mode === 'fill'}
    />
  )
  // Just past the narrow layout, as a pane insets its content.
  if (mode === 'maxHeight')
    return <div style={{ width: width - 100 }}>{table}</div>
  return (
    <div data-testid='width' style={{ height: 600, width, display: 'grid' }}>
      <Pane>
        <Pane.Header>
          <Pane.Title>Shows</Pane.Title>
        </Pane.Header>
        <Pane.Body>{table}</Pane.Body>
      </Pane>
    </div>
  )
}

/** What scrolls the rows down, and what scrolls them sideways. */
function scrollers(container: HTMLElement, mode: Mode) {
  if (mode === 'pane')
    return {
      down: slot(container, 'pane-viewport'),
      sideways: slot(container, 'record-table-scroller')
    }
  const viewport = slot(container, 'record-table-viewport')
  return { down: viewport, sideways: viewport }
}

const toolbar = () => screen.getByRole('toolbar', { name: 'Bulk actions' })

describe('RecordTable selection bar', () => {
  for (const mode of ['pane', 'maxHeight', 'fill'] as const) {
    it(`takes the header's place without moving the rows, and stays put while scrolling (${mode})`, async () => {
      const { container } = render(<Shows mode={mode} />)
      await frame()
      const headRow = slot(container, 'record-table-head-row')
      const header = rect(headRow)
      const firstRow = slot(container, 'record-table-row')
      const rowTop = rect(firstRow).top
      const pageCheckbox = screen.getByRole('checkbox', { name: 'Select page' })
      const checkboxLeft = rect(pageCheckbox).left
      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
      )
      await expect.poll(() => toolbar().isConnected).toBe(true)
      await frame()
      expect(near(rect(firstRow).top, rowTop)).toBe(true)
      expect(near(rect(headRow).top, header.top)).toBe(true)
      expect(near(rect(headRow).height, header.height)).toBe(true)
      expect(near(rect(pageCheckbox).left, checkboxLeft)).toBe(true)
      const start = rect(toolbar())

      const { down, sideways } = scrollers(container, mode)
      await expect
        .poll(() => {
          down.scrollTop = 1500
          sideways.scrollLeft = 200
          return down.scrollTop > 0 && sideways.scrollLeft > 0
        })
        .toBe(true)
      await frame()
      const bar = rect(toolbar())
      expect(near(bar.left, start.left)).toBe(true)
      expect(near(bar.width, start.width)).toBe(true)
      const box = rect(down)
      expect(bar.top).toBeGreaterThanOrEqual(box.top - 1)
      expect(bar.bottom).toBeLessThanOrEqual(box.bottom)
      const frameBox = rect(slot(container, 'record-table-frame'))
      const archive = rect(
        within(toolbar()).getByRole('button', { name: 'Archive' })
      )
      expect(archive.left).toBeGreaterThanOrEqual(frameBox.left)
      expect(archive.right).toBeLessThanOrEqual(frameBox.right)
    })
  }

  it('lines the columns up with the rows again once the selection clears', async () => {
    const { container } = render(<Shows mode='pane' />)
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select Ocean Alley 1'
    })
    await userEvent.click(checkbox)
    const sideways = slot(container, 'record-table-scroller')
    await expect
      .poll(() => {
        sideways.scrollLeft = 200
        return sideways.scrollLeft > 0
      })
      .toBe(true)
    await userEvent.click(checkbox)
    await frame()
    const header = screen.getByRole('columnheader', { name: 'Gross' })
    const cell = slot(container, 'record-table-row').querySelectorAll(
      '[role="cell"]'
    )[4]!
    expect(near(rect(header).left, rect(cell).left)).toBe(true)
  })

  it('moves the actions that do not fit into More actions, still confirming from there', async () => {
    const onRefund = vi.fn()
    const many = [
      ...[
        'Send reminder',
        'Move to another date',
        'Change ticket type',
        'Export as spreadsheet',
        'Archive shows'
      ].map((label) => ({ label, onAction: () => {} })),
      { label: 'Refund', intent: 'danger' as const, onAction: onRefund }
    ]
    const { container } = render(
      <Shows mode='pane' width={1400} bulkActions={many} />
    )
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await expect.poll(() => toolbar().isConnected).toBe(true)
    expect(
      within(toolbar()).queryByRole('button', { name: 'More actions' })
    ).toBeNull()
    container.querySelector<HTMLElement>('[data-testid="width"]')!.style.width =
      '760px'
    await expect
      .poll(() =>
        within(toolbar()).queryByRole('button', { name: 'More actions' })
      )
      .not.toBeNull()
    const bar = rect(toolbar())
    for (const button of within(toolbar()).getAllByRole('button'))
      expect(rect(button).right).toBeLessThanOrEqual(bar.right + 1)
    expect(
      within(toolbar()).queryByRole('button', { name: 'Archive shows' })
    ).toBeNull()
    await userEvent.click(
      within(toolbar()).getByRole('button', { name: 'More actions' })
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Archive shows' })
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Refund' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(onRefund).not.toHaveBeenCalled()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Refund' })
    )
    expect(onRefund).toHaveBeenCalledWith(
      { ids: ['0'] },
      expect.objectContaining({ search: '' })
    )
  })

  it('counts its own padding when fitting actions', async () => {
    const { container } = render(
      <Shows mode='pane' width={1400} bulkActions={many} />
    )
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await expect.poll(() => toolbar().isConnected).toBe(true)
    await frame()
    const bar = toolbar()
    const style = getComputedStyle(bar)
    const gap = parseFloat(style.columnGap)
    const padding = parseFloat(style.paddingInlineEnd)
    expect(padding).toBeGreaterThan(1)
    const natural = (part: string) =>
      [...bar.querySelectorAll(`[data-slot="${part}"]`)].map(
        (element) => rect(element).width
      )
    const needed = natural('records-bulk-action').reduce(
      (sum, action) => sum + gap + action,
      natural('records-bulk-count')[0]!
    )
    // Every action fits the bar's box, but not once its end padding is out.
    const target = needed + padding / 2
    const sizer = container.querySelector<HTMLElement>('[data-testid="width"]')!
    for (let pass = 0; pass < 3; pass++) {
      const width = parseFloat(sizer.style.width)
      sizer.style.width = `${width + target - rect(bar).width}px`
      await frame()
      await frame()
    }
    expect(Math.abs(rect(bar).width - target)).toBeLessThan(padding / 4)
    await expect
      .poll(() =>
        within(toolbar()).queryByRole('button', { name: 'More actions' })
      )
      .not.toBeNull()
  })

  const many = [
    'Send reminder',
    'Move to another date',
    'Change ticket type',
    'Export as spreadsheet',
    'Archive shows'
  ].map((label) => ({ label, onAction: () => {} }))

  it('adds no sideways scroll to the page outside a pane', async () => {
    render(
      <div style={{ width: 900 }}>
        <RecordTable
          caption='Shows'
          data={testShows(20)}
          fields={showFields}
          columns={wideColumns}
          defaultPosition={ALL}
          // More than any screen holds, so the measured row overflows.
          bulkActions={[...many, ...many, ...many].map((action, index) => ({
            ...action,
            label: `${action.label} ${index}`
          }))}
        />
      </div>
    )
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await expect.poll(() => toolbar().isConnected).toBe(true)
    await frame()
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth
    )
  })

  for (const mode of ['maxHeight', 'fill'] as const) {
    it(`leaves the box's sideways scroll to the columns (${mode})`, async () => {
      const { container } = render(
        <Shows mode={mode} width={1000} bulkActions={many} />
      )
      const viewport = slot(container, 'record-table-viewport')
      await frame()
      const before = viewport.scrollWidth
      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
      )
      await expect.poll(() => toolbar().isConnected).toBe(true)
      await frame()
      expect(viewport.scrollWidth).toBeLessThanOrEqual(before)
    })
  }

  it('moves focus from a sort button the bar covers to Select page', async () => {
    const holder: { records?: RecordsInstance<TestShow> } = {}
    const layouts = [tableLayout(wideColumns)]
    function Held() {
      const records = useRecords<TestShow>({
        data: testShows(12),
        fields: showFields,
        getRowId: (row) => row.id,
        selectable: true
      })
      useEffect(() => {
        holder.records = records
      })
      return (
        <div style={{ width: 760 }}>
          <Records.Root records={records} layouts={layouts} caption='Shows'>
            <Records.Content />
            <Records.BulkActions actions={actions} />
          </Records.Root>
        </div>
      )
    }
    render(<Held />)
    await frame()
    screen.getByRole('button', { name: /City/ }).focus()
    act(() => holder.records!.toggleRow('show-0'))
    await frame()
    expect(document.activeElement).toBe(
      screen.getByRole('checkbox', { name: 'Select page' })
    )
  })
})
