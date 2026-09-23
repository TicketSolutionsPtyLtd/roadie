import { describe, expect, it } from 'vitest'

import { type PaneEntry, derivePositions } from '../Navigator/paneStack'
import {
  PANE_MAX_COLUMNS,
  PANE_MAX_DEPTH,
  columnTier,
  inspectorTier,
  paneCell,
  rowTier,
  visibleColumns
} from './paneColumns'

const stackStates = (levels: number) =>
  [false, true].flatMap((reveal) =>
    Array.from({ length: 2 ** levels }, (_, bits) => ({
      reveal,
      reached: Array.from(
        { length: levels },
        (_, depth) => (bits & (1 << depth)) !== 0
      )
    }))
  )

// Content widths, in rem, that the prototype frames measured at 16px/rem.
const REM = 16
const columnsAt = (px: number, top = 0, levels = PANE_MAX_COLUMNS) =>
  px / REM >= rowTier(3, top, levels)
    ? 3
    : px / REM >= rowTier(2, top, levels)
      ? 2
      : 1

const shown = (columns: number, top: number, levels: number) =>
  Array.from({ length: levels }, (_, depth) =>
    paneCell(columns, top, depth, levels)
  )
    .map((cell, depth) => ({ depth, ...cell }))
    .filter((cell) => cell.slot !== 'behind' && cell.slot !== 'ahead')
    .map(
      (cell) =>
        `${cell.depth}${cell.back ? '[Back]' : ''}${cell.close ? '[Close]' : ''}`
    )
    .join(' | ')

describe('tiers', () => {
  it('fits two columns at 46.25rem beside the root and 55.25rem beside a detail, and three at 76rem, 81rem once the window slides past the root', () => {
    expect(columnTier(1)).toBe(0)
    expect(columnTier(2)).toBe(46.25)
    expect(columnTier(2, [1])).toBe(55.25)
    expect(columnTier(3)).toBe(76)
    expect(columnTier(3, [1, 2])).toBe(81)
    expect(rowTier(3, 2, 3)).toBe(76)
    expect(rowTier(3, 3, 4)).toBe(81)
    expect(rowTier(3, 1, 2)).toBe(46.25)
    expect(rowTier(2, 0, 1)).toBe(46.25)
    expect(rowTier(2, 1, 3)).toBe(46.25)
    expect(rowTier(2, 2, 3)).toBe(55.25)
    expect(rowTier(2, 3, 4)).toBe(55.25)
  })

  it('fits the inspector once every level present fits beside it at its minimum, at any top', () => {
    expect(inspectorTier(1)).toBe(46.25)
    expect(inspectorTier(2)).toBe(69)
    expect(inspectorTier(3)).toBe(99.75)
    expect(inspectorTier(4)).toBe(105.75)
  })

  it('yields a wider inspector sooner, by the width it adds', () => {
    expect([1, 2, 3, 4].map((levels) => inspectorTier(levels, 'md'))).toEqual([
      50.25, 75, 105.75, 111.75
    ])
    expect([1, 2, 3, 4].map((levels) => inspectorTier(levels, 'lg'))).toEqual([
      54.25, 79, 109.75, 115.75
    ])
  })
})

describe('paneCell, the prototype evidence', () => {
  it('Tickets → Glamping → Sam, Sam reached', () => {
    expect(shown(columnsAt(375, 2, 3), 2, 3)).toBe('2[Back]')
    expect(shown(columnsAt(760, 2, 3), 2, 3)).toBe('2[Back]')
    expect(shown(columnsAt(932, 2, 3), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(1188, 2, 3), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(1348, 2, 3), 2, 3)).toBe('0 | 1 | 2[Close]')
  })

  it('two levels: Close on the detail, no Back', () => {
    expect(shown(columnsAt(375, 1, 2), 1, 2)).toBe('1[Back]')
    expect(shown(columnsAt(760, 1, 2), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(932, 1, 2), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(1188, 1, 2), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(1348, 1, 2), 1, 2)).toBe('0 | 1[Close]')
  })

  it('three levels with the root revealed: Sam parked ahead', () => {
    expect(shown(columnsAt(375, 0, 3), 0, 3)).toBe('0')
    expect(shown(columnsAt(760, 0, 3), 0, 3)).toBe('0 | 1')
    expect(shown(columnsAt(932, 0, 3), 0, 3)).toBe('0 | 1')
    expect(shown(columnsAt(1188, 0, 3), 0, 3)).toBe('0 | 1')
    expect(shown(columnsAt(1348, 0, 3), 0, 3)).toBe('0 | 1 | 2')
    expect(paneCell(2, 0, 2, 3)).toEqual({
      slot: 'ahead',
      back: false,
      close: false
    })
  })

  it('slides the window over four levels', () => {
    expect(shown(3, 3, 4)).toBe('1[Back] | 2 | 3[Close]')
    expect(paneCell(3, 3, 0, 4).slot).toBe('behind')
  })

  it('draws nothing on a middle column or the root', () => {
    expect(paneCell(3, 2, 1, 3)).toEqual({
      slot: 'parent',
      back: false,
      close: false
    })
    expect(paneCell(3, 2, 0, 3)).toEqual({
      slot: 'parent',
      back: false,
      close: false
    })
  })

  it('fills with the right-most visible pane, whatever its role would say', () => {
    expect(paneCell(2, 2, 1, 3).slot).toBe('parent')
    expect(paneCell(2, 2, 2, 3).slot).toBe('fill')
  })
})

describe('agreement with derivePositions, in every reached and reveal state', () => {
  it('puts the top where deriveTopIndex does, a reached root included', () => {
    for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
      for (const { reveal, reached } of stackStates(levels)) {
        const entries = reached.map((isReached): PaneEntry => ({
          column: 'detail',
          reached: isReached,
          tabBar: 'auto'
        }))
        const positions = derivePositions(entries, reveal)
        const top = positions.indexOf('top')
        positions.forEach((position, depth) => {
          expect(paneCell(1, top, depth, levels).slot).toBe(position)
        })
      }
    }
  })

  it('treats a reached root as the top of its stack', () => {
    const entries: PaneEntry[] = [
      { column: 'list', reached: true, tabBar: 'auto' },
      { column: 'detail', reached: false, tabBar: 'auto' }
    ]
    expect(derivePositions(entries)).toEqual(['top', 'ahead'])
    expect(paneCell(1, 0, 0, 2).slot).toBe('top')
    expect(paneCell(1, 0, 1, 2).slot).toBe('ahead')
  })
})

describe('the model a row is drawn from', () => {
  const cells = () =>
    [1, 2, 3].flatMap((columns) =>
      Array.from(
        { length: PANE_MAX_DEPTH + 1 },
        (_, index) => index + 1
      ).flatMap((levels) =>
        Array.from({ length: levels }, (_, top) =>
          Array.from({ length: levels }, (_, depth) =>
            paneCell(columns, top, depth, levels)
          )
        ).flat()
      )
    )

  it('draws one button at most on any pane', () => {
    for (const cell of cells()) expect(cell.back && cell.close).toBe(false)
  })

  it.each([1, 2, 3])(
    'never shows the inspector while the row is stacked, %i levels',
    (levels) => {
      expect(inspectorTier(levels)).toBeGreaterThanOrEqual(
        rowTier(2, levels - 1, levels)
      )
    }
  )

  it('never uses more columns than the row has levels', () => {
    expect(visibleColumns(3, 2)).toBe(2)
    expect(visibleColumns(3, 4)).toBe(3)
    expect(visibleColumns(2, 1)).toBe(1)
  })

  it('starts two columns at 46.25rem or 55.25rem, whatever the row', () => {
    const twoColumnStarts = Array.from(
      { length: PANE_MAX_DEPTH + 1 },
      (_, index) => index + 1
    ).flatMap((levels) =>
      Array.from({ length: levels }, (_, top) => rowTier(2, top, levels))
    )
    expect(new Set(twoColumnStarts)).toEqual(
      new Set([columnTier(2), columnTier(2, [1])])
    )
  })
})
