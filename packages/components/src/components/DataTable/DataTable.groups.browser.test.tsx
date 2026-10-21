import { cleanup, render, screen } from '@testing-library/react'
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
    expect(ga - general).toBeCloseTo(20, 0)
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
})
