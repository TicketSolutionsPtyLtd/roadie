import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

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
  { key: 'show', header: 'Show', kind: 'text', pin: true },
  { key: 'daily', header: 'Daily', kind: 'sparkline', priority: 3 },
  { key: 'gross', header: 'Gross', kind: 'number', priority: 1 },
  { key: 'pace', header: 'Pace', kind: 'number' }
]
const rows = [
  { show: 'Ball Park Music', daily: [1, 2, 3, 4, 5], gross: 118400, pace: 112 },
  { show: 'Ocean Alley', daily: [5, 4, 3, 2, 1], gross: 183000, pace: 101 }
]

describe('DataTable totals row', () => {
  it('reads as a strong footer that hides and pins with its columns', () => {
    const { container } = render(
      <div style={{ width: 360 }}>
        <DataTable columns={columns} rows={rows} totals />
      </div>
    )
    const cells = [...container.querySelectorAll<HTMLElement>('tfoot > tr > *')]
    const [label, , , pace] = cells
    expect(getComputedStyle(label!).position).toBe('sticky')
    for (const cell of [label!, pace!]) {
      const style = getComputedStyle(cell)
      expect(parseFloat(style.borderTopWidth)).toBeGreaterThan(0)
      expect(parseFloat(style.borderBottomWidth)).toBe(0)
      expect(style.fontWeight).toBe('600')
    }
    expect(getComputedStyle(label!).paddingLeft).toBe('0px')
    expect(getComputedStyle(pace!).textAlign).toBe('right')
    expect(
      cells
        .filter((cell) => getComputedStyle(cell).display !== 'none')
        .map((cell) => cell.textContent)
    ).toEqual(['Totals for 2 records', '213'])
  })
})
