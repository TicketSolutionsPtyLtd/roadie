import { describe, expect, it } from 'vitest'

import { funnel } from '../Funnel/definition'
import { rankedBars } from '../RankedBars/definition'
import { stackedBars } from '../StackedBars/definition'
import { renderChartSvg } from '../static'
import {
  categoryLines,
  categoryRoom,
  fitLines,
  withCategoryTitles
} from './categoryLabels'
import { textWidth } from './endLabels'
import { plotFrame } from './frame'

const LONG = 'Kelpie Moon Festival of Bonfires and Strange Machines, 31 Oct'

describe('categoryRoom', () => {
  const at = (width: number) => plotFrame(220, 'narrow', undefined, width)

  it('takes what the longest name needs when it is short', () => {
    expect(categoryRoom(['Email', 'Direct'], at(600))).toBe(
      textWidth('Direct', at(600)) + 8
    )
  })

  it('caps a long name at 40% of the width', () => {
    expect(categoryRoom([LONG], at(300))).toBe(120)
  })

  it('never gives a narrow plot less than 72px', () => {
    expect(categoryRoom([LONG], at(150))).toBe(72)
  })

  it('never takes more than 240px on a wide plot', () => {
    expect(categoryRoom([LONG.repeat(3)], at(1200))).toBe(240)
  })
})

describe('fitLines', () => {
  const frame = plotFrame(220, 'narrow', undefined, 320)
  const fits = (line: string, width: number) => textWidth(line, frame) <= width

  it('keeps a name that fits on one line', () => {
    expect(fitLines('Email', 100, frame, 2)).toEqual(['Email'])
  })

  it('wraps at a word onto a second line', () => {
    const lines = fitLines('Kazoo Hollow Room', 90, frame, 2)
    expect(lines).toEqual(['Kazoo Hollow', 'Room'])
  })

  it('ends the last line with an ellipsis when the name runs on', () => {
    const lines = fitLines(LONG, 100, frame, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatch(/…$/)
    for (const line of lines) expect(fits(line, 100)).toBe(true)
  })

  it('cuts to one line when only one fits', () => {
    const lines = fitLines(LONG, 100, frame, 1)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^Kelpie Moon.*…$/)
    expect(fits(lines[0]!, 100)).toBe(true)
  })

  it('breaks a word too long for a line', () => {
    const lines = fitLines('Woolloongabbaloongabba Hall', 60, frame, 2)
    expect(lines).toHaveLength(2)
    for (const line of lines) expect(fits(line, 60)).toBe(true)
    expect(lines.join('').replace('…', '')).toMatch(/^Woolloongabba/)
  })

  it('never splits an emoji', () => {
    const [line] = fitLines('🎸🎸🎸🎸🎸🎸🎸🎸🎸🎸🎸🎸', 40, frame, 1)
    expect(line).toMatch(/^(🎸)+…$/u)
  })

  it('always keeps at least one character', () => {
    expect(fitLines('Woolloongabba', 1, frame, 1)).toEqual(['W…'])
  })
})

describe('categoryLines', () => {
  it('allows two lines when each row has room for them', () => {
    expect(categoryLines(plotFrame(220, 'default'), 4, 8)).toBe(2)
  })

  it('drops to one line when rows are too tight for two', () => {
    expect(categoryLines(plotFrame(220, 'default'), 8, 8)).toBe(1)
  })
})

describe('withCategoryTitles', () => {
  it('gives each category label its full name as a title', () => {
    const key = `label-category:object:null:string:30:${JSON.stringify(['A & B <C>', 0, 'A & B…'])}`
    const svg = `<g><text data-ts-key="${key.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}" x="1">A &amp; B…</text></g>`
    expect(withCategoryTitles(svg)).toContain(
      '<title>A &amp; B &lt;C&gt;</title>A &amp; B…</text>'
    )
  })

  it('leaves other text alone', () => {
    const svg = '<text data-ts-key="label-values:x">612</text>'
    expect(withCategoryTitles(svg)).toBe(svg)
  })
})

describe('category labels in a static file', () => {
  const names = [LONG, 'Ember Galah Ball, 8 Nov', 'Lampshade Disco, 14 Nov']
  const cases = [
    [
      'ranked bars',
      () =>
        renderChartSvg(
          rankedBars,
          {
            data: names.map((show, i) => ({ show, perDay: 9 - i })),
            x: 'show',
            y: 'perDay'
          },
          { mode: 'light', width: 320, height: 220 }
        )
    ],
    [
      'stacked bars',
      () =>
        renderChartSvg(
          stackedBars,
          {
            data: names.map((show, i) => ({
              show,
              phase: 'Presale',
              sold: 9 - i
            })),
            x: 'show',
            y: 'sold',
            series: 'phase'
          },
          { mode: 'light', width: 320, height: 220 }
        )
    ],
    [
      'funnel',
      () =>
        renderChartSvg(
          funnel,
          { steps: names.map((label, i) => ({ label, value: 9 - i })) },
          { mode: 'dark', width: 320, height: 220 }
        )
    ]
  ] as const

  const labelsOf = (svg: string) =>
    [
      ...svg.matchAll(
        /<text data-ts-key="label-category[^"]*" [^>]*x="([\d.]+)"[^>]*font-size="(\d+)"[^>]*><title>([^<]*)<\/title>([^<]*)<\/text>/g
      )
    ].map(([, x, size, title, line]) => ({
      x: Number(x),
      frame: plotFrame(220, 'narrow', undefined, 320),
      size: Number(size),
      title: title!.replace(/&amp;/g, '&'),
      line: line!
    }))

  it.each(cases)('keeps %s names inside the file', (_, render) => {
    const labels = labelsOf(render())
    expect(labels.length).toBeGreaterThanOrEqual(names.length)
    for (const label of labels) {
      expect(label.size).toBe(11)
      expect(
        label.x - textWidth(label.line, label.frame)
      ).toBeGreaterThanOrEqual(0)
    }
  })

  it.each(cases)(
    'wraps a long %s name to two lines and titles it',
    (_, render) => {
      const long = labelsOf(render()).filter((label) => label.title === LONG)
      expect(long).toHaveLength(2)
      expect(long[1]!.line).toMatch(/…$/)
    }
  )
})
