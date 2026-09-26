import {
  type ChartScene,
  type ChartValue,
  createChartScene
} from '@tanstack/charts'

import type {
  ChartDefinition,
  ChartPaint,
  EngineDefinition,
  PlotFrame
} from './types'

export const DRAW_ERROR = "This chart couldn't be drawn"

export type Drawing = {
  definition: EngineDefinition
  scene: ChartScene<unknown, ChartValue, ChartValue>
}

declare const process: { env?: { NODE_ENV?: string } } | undefined

const warned = new Set<string>()

function warnOnce(kind: string, error: unknown) {
  if (typeof process === 'undefined' || process?.env?.NODE_ENV === 'production')
    return
  const message = `Roadie could not draw a ${kind} chart: ${error instanceof Error ? error.message : String(error)}`
  if (warned.has(message)) return
  warned.add(message)
  console.error(message)
}

/**
 * Builds and lays out a chart, or returns null when its data can't be drawn.
 * The engine throws on bad scales and stacks while laying out the scene, not
 * while defining it, so both run here and one bad chart never takes down a page.
 */
export function draw<P>(
  chart: ChartDefinition<P>,
  props: P,
  paint: ChartPaint,
  frame: PlotFrame
): Drawing | null {
  try {
    const definition = chart.build(props, paint, frame)
    const scene = createChartScene(definition, {
      width: frame.width,
      height: frame.height
    })
    return { definition, scene }
  } catch (error) {
    warnOnce(chart.kind, error)
    return null
  }
}
