import { describe, expect, it } from 'vitest'

import { CHART_PLOT_KINDS } from '@oztix/roadie-core/dashboard'
import { chartHex } from '@oztix/roadie-core/dataviz'

import * as staticEntry from '.'
import { renderChartSvg } from '.'
import { lineChart } from '../LineChart/definition'
import { paceExample, salesByTypeExample } from '../LineChart/examples'
import { gatesExample } from '../SmallMultiples/examples'
import { brokenChart, testPoints } from '../plot/testChart'

describe('renderChartSvg', () => {
  const svg = renderChartSvg(lineChart, paceExample, {
    mode: 'light',
    width: 640,
    height: 260
  })

  it('is a standalone SVG file', () => {
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /)
    expect(svg).toContain('width="640" height="260"')
    expect(svg).toContain('font-family:Intermission')
    expect(svg).toContain('font-variant-numeric:tabular-nums')
    expect(svg).not.toContain('tabindex')
  })

  it('paints with hex and never CSS variables', () => {
    expect(svg).not.toContain('var(--')
  })

  it('leaves out the focus layers only a live chart uses', () => {
    expect(svg).not.toContain('data-ts-focus-layer')
    expect(svg.match(/<g[\s>]/g)?.length).toBe(svg.match(/<\/g>/g)?.length)
  })

  it('names the image with the takeaway', () => {
    expect(svg).toContain(`aria-label="${paceExample.takeaway}"`)
  })

  it('haloes the labels', () => {
    expect(svg).toContain('paint-order:stroke')
  })

  it('renders the empty copy for too little data', () => {
    expect(
      renderChartSvg(
        lineChart,
        { data: [{ day: '2026-10-01', sold: 1 }], x: 'day', y: 'sold' },
        { mode: 'dark', width: 320, height: 160 }
      )
    ).toContain('Not enough data yet to show a trend')
  })

  it('escapes the empty copy and the name', () => {
    const empty = renderChartSvg(
      { ...lineChart, emptyMessage: () => 'Sales & <refunds>' },
      paceExample,
      { mode: 'light', width: 320, height: 160 }
    )
    expect(empty).toContain('aria-label="Sales &amp; &lt;refunds&gt;"')
  })

  it('keeps end labels and no legend where they fit', () => {
    const wide = renderChartSvg(lineChart, salesByTypeExample, {
      mode: 'light',
      width: 640,
      height: 220
    })
    expect(wide).toContain('data-ts-key="label-end')
    expect(wide).not.toContain('data-slot="chart-legend"')
  })

  it('names a lone series and its reading aids on a phone', () => {
    const narrow = renderChartSvg(lineChart, paceExample, {
      mode: 'light',
      width: 360,
      height: 260
    })
    expect(narrow).not.toContain('data-ts-key="label-end')
    const legend = /<g data-slot="chart-legend"[^>]*>(.*?)<\/g>/.exec(narrow)
    expect(legend?.[1]).toMatch(
      />Sold<.*>Forecast<.*>Similar shows<.*>Target 85%</
    )
    expect(legend?.[1]).not.toContain('median')
  })

  it('draws the band key with its median through it, like the live key', () => {
    const narrow = renderChartSvg(lineChart, paceExample, {
      mode: 'light',
      width: 360,
      height: 260
    })
    const legend = /<g data-slot="chart-legend"[^>]*>(.*?)<\/g>/.exec(narrow)
    expect(legend?.[1]).toMatch(
      /<rect [^>]*height="6"[^>]*\/><line [^>]*stroke-dasharray="3 3"\/><text [^>]*>Similar shows</
    )
    expect(legend?.[1]).toContain(
      `stroke="${chartHex('light').greys.median}" stroke-width="1.25" stroke-dasharray="3 3"`
    )
  })

  it('draws a legend row when end labels do not fit', () => {
    const narrow = renderChartSvg(lineChart, salesByTypeExample, {
      mode: 'light',
      width: 320,
      height: 220
    })
    expect(narrow).not.toContain('data-ts-key="label-end')
    const legend = /<g data-slot="chart-legend"[^>]*>(.*?)<\/g>/.exec(narrow)
    expect(legend?.[1]).toMatch(/>GA<.*>VIP<.*>Early bird</)
    expect(narrow).toContain('viewBox="0 -24 320 220"')
  })
})

describe('the static entry', () => {
  const definitions = Object.values(staticEntry).filter(
    (value) => typeof value === 'object' && 'kind' in value
  )

  it('exports a definition for every single-plot kind', () => {
    expect(definitions.map((d) => d.kind).sort()).toEqual(
      CHART_PLOT_KINDS.filter((kind) => kind !== 'small-multiples').sort()
    )
  })

  it('renders small multiples without React', () => {
    expect(
      staticEntry.renderSmallMultiplesSvg(gatesExample, {
        mode: 'dark',
        width: 640
      })
    ).toMatch(/^<svg /)
  })
})

describe('renderChartSvg when the chart cannot draw', () => {
  it('returns an image that says so instead of throwing', () => {
    const svg = renderChartSvg(
      brokenChart,
      { points: testPoints },
      { mode: 'light', width: 640, height: 220 }
    )
    expect(svg).toContain('couldn&#39;t be drawn')
    expect(svg).toContain('role="img"')
  })
})
