import { createChartScene, defineChart } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { renderChartSvg } from '@tanstack/charts/svg'
import { describe, expect, it, vi } from 'vitest'

import {
  type LabelBox,
  annotationMarks,
  annotationsOnAxis,
  annotationsOnBars
} from './annotations'
import { plotFrame } from './frame'
import { hexPaint } from './paint'
import { parseX } from './time'

const HOUR = 3_600_000
const hours = ['2026-08-03T09:00', '2026-08-03T10:00', '2026-08-03T12:00'].map(
  (key) => ({ key, x: parseX(key)! })
)
const onBars = (at: string | number) =>
  annotationsOnBars([{ at, label: 'On sale' }], hours, HOUR, 10).map((a) => a.x)

describe('annotationsOnBars', () => {
  it('snaps a wall time with an offset to the bar that holds it', () => {
    expect(onBars('2026-08-03T09:00:00+10:00')).toEqual(['2026-08-03T09:00'])
    expect(onBars('2026-08-03T10:45')).toEqual(['2026-08-03T10:00'])
  })

  it('snaps across a gap to the nearest bar', () => {
    expect(onBars('2026-08-03T11:50')).toEqual(['2026-08-03T12:00'])
  })

  it('measures a gap to each bar centre, not its start', () => {
    expect(onBars('2026-08-03T11:20')).toEqual(['2026-08-03T10:00'])
  })

  it('says how far across the plot the bar sits', () => {
    expect(
      annotationsOnBars(
        [{ at: '2026-08-03T12:00', label: 'On sale' }],
        hours,
        HOUR,
        10
      )[0]?.across
    ).toBeCloseTo(2.5 / 3, 5)
  })

  it('drops a date outside hourly bars', () => {
    expect(onBars('2026-08-03')).toEqual([])
    expect(onBars('2026-08-04T09:00')).toEqual([])
    expect(onBars(42)).toEqual([])
  })

  it('matches category bars by name only', () => {
    const channels = ['Email', 'Social'].map((key) => ({ key, x: key }))
    expect(
      annotationsOnBars(
        [
          { at: 'Social', label: 'New ad' },
          { at: 'Radio', label: 'Missing' }
        ],
        channels,
        null,
        10
      ).map((a) => a.x)
    ).toEqual(['Social'])
  })
})

describe('annotationsOnAxis', () => {
  const domain = [parseX('2026-10-01')!, parseX('2026-10-15')!] as const

  it('places wall times inside the domain and drops the rest', () => {
    expect(
      annotationsOnAxis(
        [
          { at: '2026-10-05T19:30:00+10:00', label: 'Inside' },
          { at: '2026-11-01', label: 'After' },
          { at: 'soon', label: 'Junk' }
        ],
        domain,
        true,
        1
      ).map((a) => a.label)
    ).toEqual(['Inside'])
  })

  it('warns once in development about each annotation it drops', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const before = [{ at: '2026-09-20', label: 'Announced' }]
    annotationsOnAxis(before, domain, true, 1)
    annotationsOnAxis(before, domain, true, 1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toMatch(
      /"Announced" at 2026-09-20 is outside the data/
    )
    warn.mockRestore()
  })

  it('says how far across the plot each annotation sits', () => {
    expect(
      annotationsOnAxis(
        [
          { at: '2026-10-01', label: 'Start' },
          { at: '2026-10-15', label: 'End' }
        ],
        domain,
        true,
        1
      ).map((a) => a.across)
    ).toEqual([0, 1])
  })
})

describe('annotationMarks', () => {
  const paint = hexPaint('light')
  const frame = plotFrame(220, 'narrow', undefined, 320)
  const span = { width: 320, left: 40, right: 8 }
  const render = (across: number, avoid: LabelBox | null = null) =>
    renderChartSvg(
      createChartScene(
        defineChart({
          marks: annotationMarks(
            [{ x: across * 10, label: 'Final release', y: 1, across }],
            paint,
            frame,
            span,
            avoid
          ),
          scales: {
            x: { scale: scaleLinear().domain([0, 10]) },
            y: { scale: scaleLinear().domain([0, 1]) }
          },
          margin: { left: span.left, right: span.right }
        }),
        { width: span.width, height: 220 }
      ),
      { ariaLabel: 'Annotations' }
    )

  it('reads right of its rule with room to spare', () =>
    expect(render(0.2)).toMatch(/text-anchor="start"/))

  it('flips left of its rule near the right edge', () =>
    expect(render(0.95)).toMatch(/text-anchor="end"/))

  // At 0.5 the rule sits at x 176, so the label reads 180 to about 270, with
  // its first line from 0 to 12 down and its second from 18 to 34.
  const labelY = (svg: string) =>
    Number(/label-annotations:[^"]*"[^>]*\sy="([\d.]+)"/.exec(svg)?.[1])
  const firstLine = { top: 0, bottom: 10 }

  it('reads on the other side of its rule to keep off a label', () => {
    const svg = render(0.5, { left: 190, right: 240, ...firstLine })
    expect(svg).toMatch(/text-anchor="end"/)
    expect(labelY(svg)).toBe(labelY(render(0.5)))
  })

  it('keeps its side when the label sits lower down', () =>
    expect(
      render(0.5, { left: 190, right: 240, top: 100, bottom: 110 })
    ).toMatch(/text-anchor="start"/))

  it('drops a line when both sides would cross the label', () => {
    expect(
      labelY(render(0.5, { left: 100, right: 260, ...firstLine }))
    ).toBeGreaterThan(labelY(render(0.5)))
  })

  it('stays put rather than drop onto a label a line down', () =>
    expect(
      labelY(render(0.5, { left: 100, right: 260, top: 20, bottom: 30 }))
    ).toBe(labelY(render(0.5))))

  // At 0.25 the rule sits at x 108, so a label left of it would cross the
  // y tick labels in the 40px margin.
  it('drops rather than read over the y tick labels', () => {
    const svg = render(0.25, { left: 120, right: 170, ...firstLine })
    expect(svg).toMatch(/text-anchor="start"/)
    expect(labelY(svg)).toBeGreaterThan(labelY(render(0.25)))
  })
})
