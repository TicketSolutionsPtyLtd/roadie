import { type ReactNode, useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent as browserUserEvent } from 'vitest/browser'

import { type RecordPosition, placeRange } from '@oztix/roadie-core/records'

import { RecordTable, tableColumns } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { frame } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const column = tableColumns<TestShow>(showFields)
const narrowColumns = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('city', { narrow: 'description' }),
  column.field('sold', { narrow: 'trailing' }),
  column.field('gross')
]
const titleOnly = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('gross', { narrow: 'trailing' })
]
const base = {
  caption: 'Shows',
  fields: showFields,
  columns: narrowColumns,
  getRowId: (row: TestShow) => row.id
}

const listRows = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>(
    '[data-slot="record-table-list-row"]'
  )
]
const box = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-testid="box"]')!
const resize = async (container: HTMLElement, width: number) => {
  box(container).style.width = `${width}px`
  await frame()
  await frame()
}

function Boxed({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div data-testid='box' style={{ width, height: 600, overflowY: 'auto' }}>
      {children}
    </div>
  )
}

describe('RecordTable narrow list rows in a browser', () => {
  it('gives every list row the fixed height', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(20)}
          getRowHref={(row) => `/shows/${row.id}`}
          rowActions={() => null}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(20)
    for (const row of listRows(container))
      expect(row.getBoundingClientRect().height).toBe(64)
  })

  it('lines row text up with the toolbar, outside Select mode', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(20)}
          getRowHref={(row) => `/shows/${row.id}`}
          rowActions={() => null}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(20)
    const left = container
      .querySelector<HTMLElement>('[data-slot="records"]')!
      .getBoundingClientRect().left
    const title = listRows(container)[0]!.querySelector<HTMLElement>(
      '[data-slot="list-item-title"]'
    )!
    // Within a pixel: the link's own box rounds differently per engine.
    expect(
      Math.abs(title.getBoundingClientRect().left - left)
    ).toBeLessThanOrEqual(1)
  })

  it('gives rows without a description the compact height', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable {...base} data={testShows(5)} columns={titleOnly} />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(5)
    for (const row of listRows(container))
      expect(row.getBoundingClientRect().height).toBe(48)
  })

  it('shows no pointer on a row without a link', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable {...base} data={testShows(3)} />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(3)
    const surface = listRows(container)[0]!.firstElementChild!
    expect(getComputedStyle(surface).cursor).not.toBe('pointer')
  })

  it('keeps a linked row untinted while its More button is hovered', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(3)}
          getRowHref={(row) => `/shows/${row.id}`}
          rowActions={() => null}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(3)
    const surface = listRows(container)[0]!.firstElementChild!
    const rest = getComputedStyle(surface).backgroundColor
    await browserUserEvent.hover(
      screen.getByRole('button', { name: 'More actions for Ocean Alley 1' })
    )
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(getComputedStyle(surface).backgroundColor).toBe(rest)
  })

  it('runs the loading bar along the top of the list', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable {...base} data={testShows(5)} loading />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(5)
    const bar = container
      .querySelector('[data-slot="record-table-progress"] > *')!
      .getBoundingClientRect()
    const list = screen
      .getByRole('list', { name: 'Shows' })
      .getBoundingClientRect()
    expect(bar.height).toBeGreaterThan(0)
    expect(bar.height).toBeLessThanOrEqual(4)
    expect(Math.abs(bar.top - list.top)).toBeLessThanOrEqual(1)
  })

  it('switches to the table and back as the box resizes', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable {...base} data={testShows(20)} />
      </Boxed>
    )
    await expect
      .poll(() => screen.queryByRole('list', { name: 'Shows' }))
      .not.toBeNull()
    await resize(container, 800)
    await expect
      .poll(() => screen.queryByRole('table', { name: 'Shows' }))
      .not.toBeNull()
    expect(screen.queryByRole('list', { name: 'Shows' })).toBeNull()
    await resize(container, 360)
    await expect
      .poll(() => screen.queryByRole('list', { name: 'Shows' }))
      .not.toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('keeps a selected record selected across the switch', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Boxed width={800}>
        <RecordTable {...base} data={testShows(20)} selectable />
      </Boxed>
    )
    await user.click(
      await screen.findByRole('checkbox', { name: 'Select Ball Park Music 1' })
    )
    await resize(container, 360)
    await expect
      .poll(() =>
        listRows(container)
          .filter((row) => row.hasAttribute('data-selected'))
          .map((row) => row.dataset.rowId)
      )
      .toEqual(['show-1'])
    await resize(container, 800)
    expect(
      await screen.findByRole('checkbox', { name: 'Select Ball Park Music 1' })
    ).toBeChecked()
  })

  it('enters Select mode without an outline flashing round the rows', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(6)}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(6)
    await user.click(screen.getByRole('button', { name: 'Select' }))
    await frame()
    for (const row of listRows(container)) {
      const style = getComputedStyle(row.firstElementChild!)
      expect(parseFloat(style.outlineWidth) || 0).toBe(0)
    }
  })

  it('keeps a narrow table in its own scroll box from scrolling sideways', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(30)}
          getRowHref={(row) => `/shows/${row.id}`}
          maxHeight='400px'
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBeGreaterThan(0)
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="record-table-viewport"]'
    )!
    expect(viewport.scrollWidth).toBe(viewport.clientWidth)
  })

  it('keeps rows whole inside their own scroll box', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(10)}
          selectable
          defaultSelection={{ ids: ['show-0'] }}
          maxHeight='400px'
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(10)
    const viewport = container
      .querySelector<HTMLElement>('[data-slot="record-table-viewport"]')!
      .getBoundingClientRect()
    const surface = listRows(container)[0]!.firstElementChild!
    const box = surface.getBoundingClientRect()
    expect(box.left).toBeGreaterThanOrEqual(viewport.left)
    expect(box.right).toBeLessThanOrEqual(viewport.right)
    expect(getComputedStyle(surface).borderTopLeftRadius).not.toBe('0px')
  })

  it('still switches after its own scroll box comes and goes', async () => {
    function Toggled() {
      const [boxed, setBoxed] = useState(true)
      return (
        <Boxed width={800}>
          <button type='button' onClick={() => setBoxed((was) => !was)}>
            Toggle box
          </button>
          <RecordTable
            {...base}
            data={testShows(10)}
            maxHeight={boxed ? '400px' : undefined}
          />
        </Boxed>
      )
    }
    const { container } = render(<Toggled />)
    await screen.findByRole('table', { name: 'Shows' })
    screen.getByRole('button', { name: 'Toggle box' }).click()
    await frame()
    await resize(container, 360)
    await expect
      .poll(() => screen.queryByRole('list', { name: 'Shows' }))
      .not.toBeNull()
  })

  it("keeps focus on a record's checkbox as Select mode goes wide", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(6)}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </Boxed>
    )
    await user.click(await screen.findByRole('button', { name: 'Select' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Julia Jacklin 1' })
    )
    screen.getByRole('checkbox', { name: 'Select Julia Jacklin 1' }).focus()
    await resize(container, 800)
    const table = await screen.findByRole('table', { name: 'Shows' })
    await expect
      .poll(() => document.activeElement)
      .toBe(
        within(table).getByRole('checkbox', { name: 'Select Julia Jacklin 1' })
      )
  })

  it('joins selected neighbours into one block', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(10)}
          selectable
          defaultSelection={{ ids: ['show-1', 'show-2', 'show-4'] }}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(10)
    const surface = (id: string) =>
      getComputedStyle(
        container.querySelector<HTMLElement>(
          `[data-slot="record-table-list-row"][data-row-id="${id}"] > div`
        )!
      )
    expect(surface('show-1').borderBottomLeftRadius).toBe('0px')
    expect(surface('show-2').borderTopLeftRadius).toBe('0px')
    expect(surface('show-2').borderBottomLeftRadius).not.toBe('0px')
    expect(surface('show-2').borderBottomLeftRadius).toBe(
      surface('show-5').borderTopLeftRadius
    )
    expect(surface('show-4').borderTopLeftRadius).not.toBe('0px')
    expect(surface('show-1').borderTopLeftRadius).not.toBe('0px')
    const divider = (id: string) =>
      getComputedStyle(
        container.querySelector(
          `[data-row-id="${id}"] [data-slot="list-item-content"]`
        )!,
        '::after'
      ).backgroundColor !== 'rgba(0, 0, 0, 0)'
    expect(
      ['show-0', 'show-1', 'show-2', 'show-3', 'show-4', 'show-5'].map(divider)
    ).toEqual([false, false, false, false, false, true])
  })

  it('moves focus to the same record after a switch', async () => {
    const { container } = render(
      <Boxed width={800}>
        <RecordTable
          {...base}
          data={testShows(20)}
          getRowHref={(row) => `/shows/${row.id}`}
        />
      </Boxed>
    )
    const table = await screen.findByRole('table', { name: 'Shows' })
    within(table).getByRole('link', { name: 'Julia Jacklin 1' }).focus()
    await resize(container, 360)
    const list = await screen.findByRole('list', { name: 'Shows' })
    await expect
      .poll(() => document.activeElement)
      .toBe(within(list).getByRole('link', { name: 'Julia Jacklin 1' }))
  })

  it('lands a restored range row under the toolbar', async () => {
    const sample = testShows(1)[0]!
    function Ranged() {
      const [position, setPosition] = useState<RecordPosition>({ row: 480 })
      const [data, setData] = useState<(TestShow | undefined)[]>([])
      return (
        <Boxed width={360}>
          <RecordTable
            {...base}
            data={data}
            rowCount={5000}
            position={position}
            onPositionChange={setPosition}
            loadRange={({ start, end }) => {
              const rows = Array.from(
                { length: Math.min(end, 5000) - start },
                (_, offset) => ({
                  ...sample,
                  id: `show-${start + offset}`,
                  show: `show-${start + offset}`
                })
              )
              setData((current) => placeRange(current, start, rows))
            }}
          />
        </Boxed>
      )
    }
    const { container } = render(<Ranged />)
    const toolbar = container.querySelector<HTMLElement>(
      '[data-slot="records-toolbar"]'
    )!
    await expect
      .poll(() => {
        const row = listRows(container).find(
          (element) => element.dataset.rowId === 'show-480'
        )
        if (!row) return null
        return Math.abs(
          row.getBoundingClientRect().top -
            toolbar.getBoundingClientRect().bottom
        )
      })
      .toBeLessThanOrEqual(1)
  })
})
