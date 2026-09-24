import { createChartScene, defineChart } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { renderChartSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { bandMarks, forecastMarks, targetMark, todayMarks } from './aids'
import { annotationMarks } from './annotations'
import { plotFrame } from './frame'
import { hexPaint } from './paint'

const paint = hexPaint('light')
const frame = plotFrame(220, 'default')

function render(marks: ReturnType<typeof bandMarks>) {
  const definition = defineChart({
    marks,
    scales: {
      x: { scale: scaleLinear().domain([0, 10]) },
      y: { scale: scaleLinear().domain([0, 1]) }
    }
  })
  return renderChartSvg(
    createChartScene(definition, { width: 400, height: 220 }),
    {
      ariaLabel: 'Aids'
    }
  )
}

describe('reading aids', () => {
  const svg = render([
    ...bandMarks(
      [
        { x: 0, low: 0.1, high: 0.2 },
        { x: 10, low: 0.7, high: 0.9 }
      ],
      [
        { x: 0, y: 0.15 },
        { x: 10, y: 0.8 }
      ],
      paint
    ),
    ...forecastMarks(
      [
        { x: 6, y: 0.5 },
        { x: 10, y: 0.9 }
      ],
      [
        { x: 6, low: 0.5, high: 0.5 },
        { x: 10, low: 0.8, high: 1 }
      ],
      1,
      paint
    ),
    targetMark(0.85, [0, 10], paint),
    ...todayMarks({ x: 6, y: 0.5, label: 'Today 50%' }, paint, frame),
    ...annotationMarks([{ x: 3, label: 'Line-up drop', y: 1 }], paint, frame)
  ])

  it.each([
    'band',
    'median',
    'cone',
    'forecast-1',
    'target',
    'today',
    'label-today',
    'annotation-rules',
    'label-annotations'
  ])('draws the %s mark', (id) =>
    expect(svg).toMatch(new RegExp(`data-ts-key="${id}(:[^"]*)?"`))
  )

  it('dashes the median and dots the forecast', () => {
    expect(svg).toContain('stroke-dasharray="3 3"')
    expect(svg).toContain('stroke-dasharray="0.5 4"')
  })

  it('sets label text at the frame font size', () => {
    expect(svg).toMatch(/font-size="12"/)
  })
})
