/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { type PaneEntry, derivePositions } from '../Navigator/paneStack'
import {
  PANE_MAX_DEPTH,
  columnTier,
  inspectorTier,
  paneCell,
  parentTrack,
  renderPaneColumnsCss
} from './paneColumns'

const cssPath = join(__dirname, '../../css/pane-columns.css')

// Content widths, in rem, that the prototype frames measured at 16px/rem.
const REM = 16
const columnsAt = (px: number) =>
  px / REM >= columnTier(3) ? 3 : px / REM >= columnTier(2) ? 2 : 1

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
  it('fits two columns at 46.25rem and three at 63rem', () => {
    expect(columnTier(1)).toBe(0)
    expect(columnTier(2)).toBe(46.25)
    expect(columnTier(3)).toBe(63)
  })

  it('fits the inspector once every level present fits beside it', () => {
    expect(inspectorTier(1)).toBe(44.25)
    expect(inspectorTier(2)).toBe(61)
    expect(inspectorTier(3)).toBe(77.75)
    expect(inspectorTier(4)).toBe(77.75)
  })

  it('never starves the fill below its minimum', () => {
    expect(parentTrack(2)).toBe(
      'clamp(16rem, min(40cqi, 100cqi - 30.25rem), 24rem)'
    )
    expect(parentTrack(3)).toBe(
      'clamp(16rem, min(25cqi, (100cqi - 31rem) / 2), 20rem)'
    )
  })
})

describe('paneCell — the prototype evidence', () => {
  it('Tickets → Glamping → Sam, Sam current', () => {
    expect(shown(columnsAt(375), 2, 3)).toBe('2[Back]')
    expect(shown(columnsAt(760), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(932), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(1188), 2, 3)).toBe('0 | 1 | 2[Close]')
    expect(shown(columnsAt(1348), 2, 3)).toBe('0 | 1 | 2[Close]')
  })

  it('two levels: Close on the detail, no Back', () => {
    expect(shown(columnsAt(760), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(375), 1, 2)).toBe('1[Back]')
  })

  it('three levels with the root revealed: Sam parked ahead', () => {
    expect(shown(columnsAt(760), 0, 3)).toBe('0 | 1')
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

describe('agreement with derivePositions', () => {
  const entry = (current: boolean): PaneEntry => ({
    role: 'detail',
    current,
    primaryNav: 'auto'
  })

  it('names the same top, behind and ahead panes in the stacked tier', () => {
    for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
      for (let top = 0; top < levels; top += 1) {
        const entries = Array.from({ length: levels }, (_, depth) =>
          entry(depth === top && top > 0)
        )
        const positions = derivePositions(entries, top === 0)
        positions.forEach((position, depth) => {
          expect(paneCell(1, top, depth, levels).slot).toBe(position)
        })
      }
    }
  })
})

describe('the generated stylesheet', () => {
  it('is what the table renders', () => {
    expect(readFileSync(cssPath, 'utf8')).toBe(renderPaneColumnsCss())
  })

  it('scopes every rule to a level', () => {
    const css = renderPaneColumnsCss()
    const rowRules =
      css.match(
        /\[data-slot="navigator-panes"\]\[data-level="[01]"\][^{]*\{/g
      ) ?? []
    expect(rowRules.length).toBeGreaterThan(0)
    for (const rule of rowRules) {
      const level = rule.match(/\[data-level="([01])"\]/)?.[1]
      for (const pane of rule.match(/\[data-stack\][^\s,)]*/g) ?? []) {
        expect(pane).toContain(`[data-level="${level}"]`)
      }
    }
  })

  it('draws one button at most in every rule', () => {
    const css = renderPaneColumnsCss()
    expect(css).not.toMatch(/--pane-back: grid; --pane-close: grid/)
  })

  it('hides the More pane while closed and the other root while open', () => {
    const css = renderPaneColumnsCss()
    expect(css).toContain(
      '[data-slot="navigator-panes"]:not([data-overflow]) [data-stack][data-overflow] { display: none; }'
    )
    expect(css).toContain(
      '[data-slot="navigator-panes"][data-overflow] [data-stack][data-depth="0"]:not([data-overflow]) { display: none; }'
    )
  })

  it('offers the inspector variant with one branch per level count', () => {
    const css = renderPaneColumnsCss()
    expect(css.match(/@container panes \(width < /g)).toHaveLength(4)
    expect(css).toContain('@custom-variant pane-inspector-yielded {')
  })
})
