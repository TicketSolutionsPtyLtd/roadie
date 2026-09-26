import { createChartScene, defineChart, lineY, text } from '@tanstack/charts'
import type {
  DomChartDefinition,
  StaticChartDefinition
} from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { renderChartSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import type { EngineDefinition } from './types'

const rows = [
  { x: 0, y: 1 },
  { x: 1, y: null },
  { x: 2, y: 3 }
]

function build(): EngineDefinition {
  return defineChart({
    marks: [
      lineY(rows, { id: 'series-1', x: 'x', y: 'y', stroke: 'red' }),
      text([{ x: 2, y: 3, label: 'End' }], {
        id: 'label-end',
        x: 'x',
        y: 'y',
        text: 'label'
      })
    ],
    scales: {
      x: { scale: scaleLinear().domain([0, 2]) },
      y: { scale: scaleLinear().domain([0, 4]) }
    }
  })
}

export const reactHostAccepts = (
  definition: EngineDefinition
): DomChartDefinition => definition

export const reactHostRejectsBare = (
  definition: StaticChartDefinition
): DomChartDefinition =>
  // @ts-expect-error the bare type's tooltip host is string, not 'dom'
  definition

describe('engine contract', () => {
  const svg = renderChartSvg(
    createChartScene(build(), { width: 320, height: 160 }),
    {
      ariaLabel: 'Test'
    }
  )

  it('prefixes node keys with the mark id, so CSS can target a series', () => {
    expect(svg).toMatch(/<g data-ts-key="series-1:[^"]*"/)
    expect(svg).toMatch(/<path data-ts-key="series-1:[^"]*"/)
    expect(svg).toMatch(/data-ts-key="label-end[^"]*"/)
  })

  it('leaves a gap at a null value', () => {
    expect(svg).toMatch(/series-1:[^"]*segment:0/)
    expect(svg).toMatch(/series-1:[^"]*segment:1/)
  })

  it('omits xmlns, which the static renderer adds', () => {
    expect(svg.startsWith('<svg ')).toBe(true)
    expect(svg).not.toContain('xmlns=')
  })
})
