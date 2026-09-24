import { ruleX, text } from '@tanstack/charts'
import type { ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'

import type { ChartPaint, PlotFrame } from './types'

export type PlacedAnnotation = { x: number | string; label: string; y: number }

export function annotationMarks(
  annotations: readonly PlacedAnnotation[],
  paint: ChartPaint,
  frame: PlotFrame
): ChartMark[] {
  if (annotations.length === 0) return []
  return [
    decorative(
      ruleX(annotations, {
        id: 'annotation-rules',
        x: 'x',
        stroke: paint.axis,
        strokeWidth: 1,
        strokeDasharray: '2 3'
      })
    ),
    decorative(
      text(annotations, {
        id: 'label-annotations',
        x: 'x',
        y: 'y',
        text: 'label',
        dx: 4,
        dy: 4,
        anchor: 'start',
        fill: paint.label,
        fontSize: frame.fontSize,
        fontWeight: 600
      })
    )
  ]
}
