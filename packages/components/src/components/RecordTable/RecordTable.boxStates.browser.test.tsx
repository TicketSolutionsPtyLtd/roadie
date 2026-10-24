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
import { ROW_PX, frame, rect, showColumns, slot } from './testUtils'

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

const heightOf = (container: HTMLElement, name: string) =>
  rect(slot(container, name)).height

describe('RecordTable in a box centres a state in the space below the header', () => {
  for (const [name, state, props] of boxStates)
    for (const [layout, width] of [
      ['wide', WIDE],
      ['narrow', NARROW]
    ] as const) {
      it(`${name}, ${layout}, fill`, async () => {
        const table = (fill: boolean) => (
          <RecordTable
            {...props}
            fields={showFields}
            columns={showColumns}
            fill={fill}
          />
        )
        const { container } = render(
          <Parent width={width}>{table(true)}</Parent>
        )
        const { container: unboxed } = render(
          <div style={{ width }}>{table(false)}</div>
        )
        await expect
          .poll(() => stateOffCentre(container, 'record-table', state))
          .toBeLessThanOrEqual(2)
        expect(heightOf(container, state)).toBeCloseTo(
          heightOf(unboxed, state),
          0
        )
        expect(
          rect(slot(container, 'record-table-viewport')).height
        ).toBeGreaterThan(HEIGHT / 2)
        if (layout === 'wide')
          expect(
            rect(slot(container, 'record-table-head')).height
          ).toBeLessThan(ROW_PX)
      })
    }
})

describe('RecordTable in a box keeps what stands for rows at the top', () => {
  for (const [what, width, narrow, item, props] of [
    ['rows', WIDE, undefined, 'record-table-row', { data: testShows(3) }],
    ['rows', NARROW, 'list', 'record-table-list-row', { data: testShows(3) }],
    ['cards', NARROW, 'cards', 'record-table-card', { data: testShows(3) }],
    // Placeholders stand in for rows, so they sit where the rows will land.
    [
      'loading placeholders',
      WIDE,
      undefined,
      'record-table-placeholder-row',
      { data: [], loading: true }
    ],
    [
      'loading placeholders',
      NARROW,
      'list',
      'record-table-placeholder-row',
      { data: [], loading: true }
    ]
  ] as const)
    it(`${what}, ${narrow ?? 'wide'}`, async () => {
      const table = (fill: boolean) => (
        <RecordTable
          {...props}
          fields={showFields}
          columns={showColumns}
          narrow={narrow}
          fill={fill}
        />
      )
      const { container: boxed } = render(
        <Parent width={width}>{table(true)}</Parent>
      )
      const { container: unboxed } = render(
        <div style={{ width }}>{table(false)}</div>
      )
      await frame()
      expect(
        Math.abs(
          rect(slot(boxed, item)).top -
            rect(slot(boxed, 'record-table-scroller')).top
        )
      ).toBeLessThanOrEqual(1)
      expect(heightOf(boxed, item)).toBeCloseTo(heightOf(unboxed, item), 0)
    })
})
