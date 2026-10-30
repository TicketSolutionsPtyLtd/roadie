import { describe, expect, it } from 'vitest'

import type { ChartDocument } from '@oztix/roadie-core/dashboard'
import { chartHex } from '@oztix/roadie-core/dataviz'

import { ChartDocumentError, renderChartDocument } from '.'
import { scanRateExample } from '../BarChart/examples'
import { checkoutExample } from '../Funnel/examples'
import { whenFansBuyExample } from '../Heatmap/examples'
import { leadTimeExample } from '../Histogram/examples'
import { paceExample } from '../LineChart/examples'
import { channelExample } from '../RankedBars/examples'
import { portfolioExample } from '../Scatter/examples'
import { gatesExample } from '../SmallMultiples/examples'
import { scansByGateExample } from '../StackedArea/examples'
import { ticketMixExample } from '../StackedBars/examples'

const SIZE = { width: 640, height: 360 }

// A static plot is only an image, so its document carries the numbers too.
const paceTable = {
  columns: [
    { key: 'week', header: 'Week', kind: 'text' as const },
    {
      key: 'sold',
      header: 'Sold',
      kind: 'number' as const,
      format: 'percent' as const
    }
  ],
  rows: [{ week: '15 Oct', sold: 0.61 }]
}

const document = (
  plot: ChartDocument['plot'],
  extra: Partial<ChartDocument> = {}
): ChartDocument => ({
  version: 1,
  kind: 'chart',
  label: 'Tickets sold',
  source: 'Oztix sales, updated hourly.',
  plot,
  ...(plot.kind === 'static' && { table: paceTable }),
  ...extra
})

const plots: Record<ChartDocument['plot']['kind'], ChartDocument['plot']> = {
  line: { kind: 'line', ...paceExample },
  bar: { kind: 'bar', ...scanRateExample },
  'ranked-bars': { kind: 'ranked-bars', ...channelExample },
  'stacked-bars': { kind: 'stacked-bars', ...ticketMixExample },
  'stacked-area': { kind: 'stacked-area', ...scansByGateExample },
  histogram: { kind: 'histogram', ...leadTimeExample },
  funnel: { kind: 'funnel', ...checkoutExample },
  heatmap: { kind: 'heatmap', ...whenFansBuyExample },
  scatter: { kind: 'scatter', ...portfolioExample },
  'small-multiples': { kind: 'small-multiples', ...gatesExample },
  static: {
    kind: 'static',
    src: '/charts/pace.svg',
    srcDark: '/charts/pace-dark.svg',
    alt: 'Sales are ahead of similar shows'
  }
}

const textOf = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1])

describe('renderChartDocument', () => {
  describe.each(Object.entries(plots))('a %s plot', (kind, plot) => {
    const svg = renderChartDocument(document(plot), {
      mode: 'light',
      ...SIZE
    })

    it('matches its snapshot', async () => {
      await expect(svg).toMatchFileSnapshot(
        `./__snapshots__/document-${kind}.svg`
      )
    })

    it('is one standalone file at the size asked for', () => {
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /)
      expect(svg).toContain('width="640" height="360"')
      expect(svg).not.toContain('var(--')
      expect(svg.match(/<svg[\s>]/g)?.length).toBe(
        svg.match(/<\/svg>/g)?.length
      )
    })

    it('draws the label above the plot and the source below it', () => {
      const texts = textOf(svg)
      expect(texts[0]).toBe('Tickets sold')
      expect(texts.at(-1)).toBe('Oztix sales, updated hourly.')
    })
  })

  it('draws the headline value in its format, with its delta', () => {
    const svg = renderChartDocument(
      document(plots.line, {
        value: 0.42,
        format: 'percent',
        delta: { value: 0.05, format: 'percent' },
        context: 'Since on sale'
      }),
      { mode: 'light', ...SIZE }
    )
    const texts = textOf(svg)
    expect(texts.slice(0, 4)).toEqual([
      'Tickets sold',
      'Since on sale',
      '42%',
      '↑ 5%'
    ])
    expect(svg).toContain(`fill="${chartHex('light').status.good}">↑ 5%`)
  })

  it('matches the headline snapshot', async () => {
    await expect(
      renderChartDocument(
        document(plots.line, {
          value: 0.61,
          format: 'percent',
          delta: { value: 0.08 },
          context: 'Since on sale'
        }),
        { mode: 'dark', ...SIZE }
      )
    ).toMatchFileSnapshot('./__snapshots__/document-headline-dark.svg')
  })

  it('colours a delta by whether its change is good', () => {
    const svg = renderChartDocument(
      document(plots.line, {
        value: 1842,
        delta: { value: 12, goodWhen: 'down' }
      }),
      { mode: 'dark', ...SIZE }
    )
    expect(svg).toContain(`fill="${chartHex('dark').status.critical}">↑ 12`)
  })

  it('shows a delta with a baseline as its value, read against the baseline', () => {
    const delta = (value: number) =>
      textOf(
        renderChartDocument(
          document(plots.line, {
            value: 1842,
            delta: { value, baseline: 100 }
          }),
          { mode: 'light', ...SIZE }
        )
      )[2]
    expect(delta(112)).toBe('↑ 112')
    expect(delta(94)).toBe('↓ 94')
    expect(delta(100)).toBe('No change')
  })

  it('draws the takeaway when there is no value, and names the plot with it', () => {
    const svg = renderChartDocument(
      document(
        { kind: 'line', ...paceExample, takeaway: undefined },
        { takeaway: 'Sales are ahead of similar shows' }
      ),
      { mode: 'light', ...SIZE }
    )
    expect(textOf(svg)).toContain('Sales are ahead of similar shows')
    expect(svg).toContain('aria-label="Sales are ahead of similar shows"')
  })

  it('names the whole file with its label', () => {
    const svg = renderChartDocument(document(plots.bar), {
      mode: 'light',
      ...SIZE
    })
    expect(svg).toMatch(/^<svg [^>]*role="img" aria-label="Tickets sold"/)
  })

  // The file is one image to assistive tech, so its children go unread.
  it("describes the file with a static plot's alt", () => {
    const svg = renderChartDocument(document(plots.static), {
      mode: 'light',
      ...SIZE
    })
    expect(svg).toMatch(
      /^<svg [^>]*><desc>Sales are ahead of similar shows<\/desc>/
    )
  })

  it("describes the file with the plot's takeaway", () => {
    const svg = renderChartDocument(
      document(
        { kind: 'line', ...paceExample, takeaway: undefined },
        { takeaway: 'Sales are ahead & climbing' }
      ),
      { mode: 'light', ...SIZE }
    )
    expect(svg).toMatch(
      /^<svg [^>]*><desc>Sales are ahead &amp; climbing<\/desc>/
    )
  })

  it('wraps a long label rather than running off the edge', () => {
    const label =
      'Tickets sold across every show at Antler Kettle Hall and the Echidna Gaslight Theatre this month'
    const svg = renderChartDocument(document(plots.bar, { label }), {
      mode: 'light',
      width: 320,
      height: 360
    })
    const [first, second] = textOf(svg)
    expect(first).not.toBe(label)
    expect(label.startsWith(first!)).toBe(true)
    expect(label).toContain(second!.replace('…', ''))
  })

  it('cuts a long headline value short to fit beside its delta', () => {
    const value = 'Antler Kettle Hall and the Echidna Gaslight Theatre'
    const svg = renderChartDocument(
      document(plots.bar, { value, delta: { value: 12 } }),
      { mode: 'light', width: 320, height: 360 }
    )
    const shown = textOf(svg)[1]!
    expect(shown).toMatch(/…$/)
    expect(value.startsWith(shown.slice(0, -1))).toBe(true)
    expect(textOf(svg)[2]).toBe('↑ 12')
  })

  it('refuses a size that leaves no room for the plot', () => {
    expect(() =>
      renderChartDocument(document(plots.bar), {
        mode: 'light',
        width: 640,
        height: 120
      })
    ).toThrow(RangeError)
  })

  it('escapes its copy', () => {
    const svg = renderChartDocument(
      document(plots.bar, { label: 'Sales & <refunds>' }),
      { mode: 'light', ...SIZE }
    )
    expect(svg).toContain('Sales &amp; &lt;refunds&gt;')
    expect(svg).not.toContain('<refunds>')
  })

  it("draws a static plot's dark image in dark mode", () => {
    const light = renderChartDocument(document(plots.static), {
      mode: 'light',
      ...SIZE
    })
    const dark = renderChartDocument(document(plots.static), {
      mode: 'dark',
      ...SIZE
    })
    expect(light).toContain('href="/charts/pace.svg"')
    expect(dark).toContain('href="/charts/pace-dark.svg"')
  })

  it('picks the static image drawn for its width', () => {
    const svg = renderChartDocument(
      document({
        kind: 'static',
        src: '/pace.svg',
        alt: 'Sales are ahead',
        narrow: { src: '/pace-narrow.svg' }
      }),
      { mode: 'light', width: 360, height: 360 }
    )
    expect(svg).toContain('href="/pace-narrow.svg"')
  })

  it('throws the problems of a document that fails validation', () => {
    const broken = document({
      kind: 'line',
      data: [{ day: '2026-10-01', sold: 1 }],
      x: 'day',
      y: 'revenue'
    })
    expect(() =>
      renderChartDocument(broken, { mode: 'light', ...SIZE })
    ).toThrow(ChartDocumentError)
    try {
      renderChartDocument(broken, { mode: 'light', ...SIZE })
    } catch (caught) {
      expect((caught as ChartDocumentError).problems).toEqual([
        {
          path: 'plot.y',
          message: 'No row has a "revenue" field',
          severity: 'error'
        }
      ])
    }
  })

  it('throws on input that is not a chart document at all', () => {
    expect(() =>
      renderChartDocument({ kind: 'pie' } as unknown as ChartDocument, {
        mode: 'light',
        ...SIZE
      })
    ).toThrow(/version/)
  })

  it('draws a document that has only warnings', () => {
    expect(
      renderChartDocument(
        document(plots.line, { label: 'Tickets sold – October' }),
        { mode: 'light', ...SIZE }
      )
    ).toMatch(/^<svg /)
  })
})
