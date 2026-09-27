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
})
