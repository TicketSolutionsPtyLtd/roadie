import type { ReactNode } from 'react'

import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import {
  boxStates,
  showFields,
  stateOffCentre,
  testShows
} from '../Records/testUtils'
import { frame, rect, showColumns, slot } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const WIDE = 900
const NARROW = 360
const HEIGHT = 600

function Parent({ width, children }: { width: number; children: ReactNode }) {
  return <div style={{ width, height: HEIGHT }}>{children}</div>
}

describe('RecordTable in a box centres a state in the space below the header', () => {
  for (const [name, state, props] of boxStates)
    for (const [layout, width] of [
      ['wide', WIDE],
      ['narrow', NARROW]
    ] as const) {
      it(`${name}, ${layout}, fill`, async () => {
        const { container } = render(
          <Parent width={width}>
            <RecordTable
              {...props}
              fields={showFields}
              columns={showColumns}
              fill
            />
          </Parent>
        )
        await expect
          .poll(() => stateOffCentre(container, 'record-table', state))
          .toBeLessThanOrEqual(2)
        expect(
          rect(slot(container, 'record-table-viewport')).height
        ).toBeGreaterThan(HEIGHT / 2)
      })

      it(`${name}, ${layout}, maxHeight`, async () => {
        const { container } = render(
          <div style={{ width }}>
            <RecordTable
              {...props}
              fields={showFields}
              columns={showColumns}
              maxHeight='30rem'
            />
          </div>
        )
        await expect
          .poll(() => stateOffCentre(container, 'record-table', state))
          .toBeLessThanOrEqual(2)
      })
    }
})

describe('RecordTable in a box keeps what stands for rows at the top', () => {
  for (const [layout, width, row] of [
    ['wide', WIDE, 'record-table-row'],
    ['narrow', NARROW, 'record-table-list-row']
  ] as const) {
    it(`rows, ${layout}`, async () => {
      const { container } = render(
        <Parent width={width}>
          <RecordTable
            data={testShows(3)}
            fields={showFields}
            columns={showColumns}
            fill
          />
        </Parent>
      )
      await frame()
      expect(
        Math.abs(
          rect(slot(container, row)).top -
            rect(slot(container, 'record-table-scroller')).top
        )
      ).toBeLessThanOrEqual(1)
    })

    // Placeholders stand in for rows, so they sit where the rows will land.
    it(`loading placeholders, ${layout}`, async () => {
      const { container } = render(
        <Parent width={width}>
          <RecordTable
            data={[]}
            loading
            fields={showFields}
            columns={showColumns}
            fill
          />
        </Parent>
      )
      await frame()
      expect(
        Math.abs(
          rect(slot(container, 'record-table-skeleton')).top -
            rect(slot(container, 'record-table-scroller')).top
        )
      ).toBeLessThanOrEqual(1)
    })
  }
})
