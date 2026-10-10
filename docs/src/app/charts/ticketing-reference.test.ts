import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { TICKETING_REFERENCE } from './ticketing-reference'

const CHART_TYPES = [
  'LineChart',
  'BarChart',
  'RankedBars',
  'StackedBars',
  'Histogram',
  'Funnel',
  'Heatmap',
  'Scatter',
  'SmallMultiples'
]

describe('ticketing reference', () => {
  it('answers every question with a chart type from this release', () => {
    for (const row of TICKETING_REFERENCE)
      expect(
        CHART_TYPES.some((type) => row.chart.includes(type)) ||
          row.chart.startsWith('Annotations')
      ).toBe(true)
  })

  it('uses every chart type at least once', () => {
    for (const type of CHART_TYPES)
      expect(TICKETING_REFERENCE.some((row) => row.chart.includes(type))).toBe(
        true
      )
  })

  it('has no dashes in its copy', () => {
    expect(JSON.stringify(TICKETING_REFERENCE)).not.toMatch(/[–—]/)
  })

  it('matches the questions table on the data visualisation page', () => {
    const mdx = readFileSync(
      join(import.meta.dirname, 'data-visualisation/page.mdx'),
      'utf8'
    )
    const table = mdx.split('### Questions and charts')[1]!.split('\n\n')[1]!
    const rows = table
      .split('\n')
      .slice(2)
      .map((line) =>
        line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
      )
    expect(rows).toEqual(
      TICKETING_REFERENCE.map((row) => [row.question, row.term, row.chart])
    )
  })
})
