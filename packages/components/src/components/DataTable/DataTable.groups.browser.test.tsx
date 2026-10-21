import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { DataTable, type DataTableColumn } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const columns: DataTableColumn[] = [
  { key: 'pool', header: 'Pool', kind: 'text' },
  { key: 'type', header: 'Type', kind: 'text' },
  { key: 'gate', header: 'Gate', kind: 'text' },
  { key: 'scans', header: 'Scans', kind: 'number' }
]
const rows = [
  { pool: 'General', type: 'GA', gate: 'North', scans: 250 },
  { pool: 'General', type: 'GA', gate: 'South', scans: 150 }
]

const textStart = (name: string) => {
  const text = [...document.querySelectorAll('tbody span, tbody a')].find(
    (element) => element.childElementCount === 0 && element.textContent === name
  )
  const range = document.createRange()
  range.selectNodeContents(text ?? screen.getByText(name))
  return range.getBoundingClientRect().left
}

describe('DataTable grouped rows', () => {
  it('steps each level in so a row lines up with its group label', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        groupBy={['pool', 'type']}
        defaultExpanded
      />
    )
    const general = textStart('General')
    const ga = textStart('GA')
    const north = textStart('North')
    expect(ga - general).toBeCloseTo(16, 0)
    expect(north).toBeCloseTo(ga, 0)
  })

  it('turns the caret when its group opens', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        groupBy={['pool', 'type']}
        defaultExpanded={[['General']]}
      />
    )
    const rotationOf = (name: string) =>
      getComputedStyle(
        screen.getByRole('button', { name }).querySelector('svg')!
      ).rotate
    expect(rotationOf('GA')).toBe('none')
    expect(rotationOf('General')).toBe('90deg')
  })

  it('points the closed caret along the line and the open one down in RTL', () => {
    render(
      <div dir='rtl'>
        <DataTable
          columns={columns}
          rows={rows}
          groupBy={['pool', 'type']}
          defaultExpanded={[['General']]}
        />
      </div>
    )
    const caretOf = (name: string) =>
      getComputedStyle(
        screen.getByRole('button', { name }).querySelector('svg')!
      )
    expect(caretOf('GA').scale).toBe('-1 1')
    expect(caretOf('GA').rotate).toBe('none')
    expect(caretOf('General').rotate).toBe('-90deg')
  })

  it('toggles a group from anywhere on its row, with a small muted caret', async () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} groupBy={['pool']} />
    )
    const toggle = screen.getByRole('button', { name: 'General' })
    const caret = toggle.querySelector('svg')!
    expect(getComputedStyle(toggle, '::after').cursor).toBe('pointer')
    expect(caret.getBoundingClientRect().width).toBe(12)
    expect(getComputedStyle(caret).color).not.toBe(
      getComputedStyle(toggle).color
    )
    const sum = container.querySelector<HTMLElement>(
      '[data-slot=data-table-group] > td:last-child'
    )!
    await userEvent.click(sum, { force: true })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.hover(sum, { force: true })
    expect(getComputedStyle(sum).backgroundColor).not.toBe(
      getComputedStyle(container.querySelector('tbody tr:last-child > td')!)
        .backgroundColor
    )
  })

  it("grows a group's rows open and shrinks them shut, like an Accordion", async () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} groupBy={['pool']} />
    )
    const leaf = () =>
      container.querySelector<HTMLTableRowElement>('tbody > tr:last-child')!
    const height = () => leaf().getBoundingClientRect().height
    expect(height()).toBe(0)
    const toggle = screen.getByRole('button', { name: 'General' })
    const group = toggle.closest('tr')!
    expect(getComputedStyle(group.cells[0]!).borderBottomWidth).toBe('0px')

    const transitions = () =>
      leaf()
        .getAnimations({ subtree: true })
        .map((animation) => (animation as CSSTransition).transitionProperty)
        .sort()
    toggle.click()
    await new Promise(requestAnimationFrame)
    expect(transitions()).toEqual([
      'grid-template-rows',
      'grid-template-rows',
      'grid-template-rows',
      'padding-bottom',
      'padding-bottom',
      'padding-bottom',
      'padding-top',
      'padding-top',
      'padding-top'
    ])
    await expect.poll(height).toBeGreaterThan(30)
    await expect
      .poll(() => getComputedStyle(group.cells[0]!).borderBottomWidth)
      .toBe('1px')
    expect(getComputedStyle(leaf().cells[0]!).borderBottomWidth).toBe('0px')

    toggle.click()
    await expect.poll(height).toBe(0)
  })

  it("clips only a row's height, with room for a sparkline's end dot", () => {
    const { container } = render(
      <DataTable
        columns={[
          { key: 'pool', header: 'Pool', kind: 'text' },
          { key: 'type', header: 'Type', kind: 'text' },
          { key: 'trend', header: 'Trend', kind: 'sparkline' }
        ]}
        rows={[
          { pool: 'General', type: 'GA', trend: [1, 2, 3, 4, 5] },
          { pool: 'Comp', type: 'Guest', trend: [1, 2, 3, 4, 5] }
        ]}
        groupBy={['pool']}
        defaultExpanded={[['General']]}
      />
    )
    const clipOf = (type: string) =>
      getComputedStyle(
        [...container.querySelectorAll('tbody tr')]
          .find((row) => row.textContent?.startsWith(type))!
          .querySelector('[data-slot=sparkline]')!
          .closest('[data-slot=data-table-collapse] > *')!
      )
    expect(clipOf('GA').overflowX).toBe('visible')
    expect(clipOf('GA').overflowY).toBe('clip')
    if (CSS.supports('overflow-clip-margin', '0.25rem'))
      expect(clipOf('GA').overflowClipMargin).not.toBe('0px')
    expect(clipOf('Guest').overflowClipMargin).toBe('0px')
  })

  it('covers and rings a group row with a pinned label, scrolled or not', async () => {
    const { container } = render(
      <div style={{ width: 280 }}>
        <DataTable
          columns={[
            { key: 'pool', header: 'Pool', kind: 'text' },
            { key: 'type', header: 'Type', kind: 'text', pin: true },
            { key: 'gate', header: 'Entry gate name', kind: 'text' },
            { key: 'scans', header: 'Scans at the gate', kind: 'number' },
            { key: 'late', header: 'Scans after doors', kind: 'number' }
          ]}
          rows={rows.map((row) => ({ ...row, late: 1 }))}
          groupBy={['pool']}
        />
      </div>
    )
    const toggle = screen.getByRole('button', { name: 'General' })
    const scroller = container.querySelector<HTMLElement>(
      '[data-slot=data-table-scroller]'
    )!
    const coversRow = () => {
      for (const cell of toggle.closest('tr')!.cells) {
        const box = cell.getBoundingClientRect()
        const view = scroller.getBoundingClientRect()
        const left = Math.max(box.left, view.left) + 2
        const right = Math.min(box.right, view.right) - 2
        if (right <= left) continue
        for (const x of [left, (left + right) / 2, right])
          expect(
            document
              .elementFromPoint(x, box.top + box.height / 2)
              ?.closest('button')
          ).toBe(toggle)
      }
    }
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    coversRow()
    scroller.scrollLeft = scroller.scrollWidth
    coversRow()

    await userEvent.keyboard('{Shift}')
    toggle.focus({ focusVisible: true })
    await new Promise(requestAnimationFrame)
    expect(getComputedStyle(toggle, '::after').outlineStyle).toBe('solid')
  })
})
