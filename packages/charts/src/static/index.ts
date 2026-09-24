import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'

import { DEFAULT_ACCENT_HUE, type Mode } from '@oztix/roadie-core/dataviz'

import type { ChartLegendItem } from '../ChartLegend'
import { textRoom } from '../plot/endLabels'
import { LEGEND_ROOM, plotFrame, widthBand } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { FONT_FAMILY, SVG_NS, escapeXml } from '../plot/svg'
import type { ChartDefinition, ChartPaint, PlotFrame } from '../plot/types'

export type StaticRenderOptions = {
  mode: Mode
  accentHue?: number
  width: number
  height: number
  idPrefix?: string
}

const KEY_WIDTH = 16
const KEY_GAP = 6
const ITEM_GAP = 16

type PlacedItem = ChartLegendItem & { x: number; row: number }

function placeLegend(
  items: readonly ChartLegendItem[],
  width: number,
  frame: PlotFrame
): PlacedItem[] {
  let x = 0
  let row = 0
  return items.map((item) => {
    const size = KEY_WIDTH + KEY_GAP + textRoom([item.label], frame, 0)
    if (x > 0 && x + size > width) {
      x = 0
      row += 1
    }
    const placed = { ...item, x, row }
    x += size + ITEM_GAP
    return placed
  })
}

function legendKey(item: PlacedItem, y: number, paint: ChartPaint) {
  const color = escapeXml(item.color ?? paint.highlight)
  const { x } = item
  if (item.shape === 'line' || item.shape === 'dash' || item.shape === 'dot') {
    const dash =
      item.shape === 'dash'
        ? ' stroke-dasharray="3 3"'
        : item.shape === 'dot'
          ? ' stroke-dasharray="0.5 4" stroke-linecap="round"'
          : ' stroke-linecap="round"'
    return `<line x1="${x}" x2="${x + KEY_WIDTH}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="2"${dash}/>`
  }
  return `<rect x="${x + 4}" y="${y - 4}" width="8" height="8" rx="2" fill="${color}"/>`
}

function legendRow(
  items: readonly PlacedItem[],
  paint: ChartPaint,
  room: number
) {
  const marks = items.map((item) => {
    const y = item.row * LEGEND_ROOM + LEGEND_ROOM / 2 - room
    return `${legendKey(item, y, paint)}<text x="${item.x + KEY_WIDTH + KEY_GAP}" y="${y}" dominant-baseline="central" fill="${paint.label}">${escapeXml(item.label)}</text>`
  })
  return `<g data-slot="chart-legend" aria-hidden="true">${marks.join('')}</g>`
}

const FOCUS_LAYER = /<g [^>]*data-ts-focus-layer="[^"]*"[^>]*>/

function closingIndex(svg: string, from: number) {
  const tags = /<g[\s>]|<\/g>/g
  tags.lastIndex = from
  let depth = 1
  for (let tag = tags.exec(svg); tag; tag = tags.exec(svg)) {
    depth += tag[0] === '</g>' ? -1 : 1
    if (depth === 0) return tags.lastIndex
  }
  return svg.length
}

// Focus layers only light up in a live chart; in a file they are dead weight.
function withoutFocusLayers(svg: string) {
  let result = svg
  let match = FOCUS_LAYER.exec(result)
  while (match) {
    const end = closingIndex(result, match.index + match[0].length)
    result = result.slice(0, match.index) + result.slice(end)
    match = FOCUS_LAYER.exec(result)
  }
  return result
}

function haloStyle(paint: ChartPaint) {
  return `<style>[data-ts-key^="label-"]{paint-order:stroke;stroke:${paint.surface};stroke-width:3px;stroke-linejoin:round}</style>`
}

function rootStyle(fontSize: number, paint: ChartPaint) {
  return `font-family:${FONT_FAMILY};font-size:${fontSize}px;font-variant-numeric:tabular-nums;color:${paint.label};background:${paint.surface};`
}

function standalone(
  svg: string,
  { width, height }: StaticRenderOptions,
  frame: PlotFrame,
  paint: ChartPaint,
  legend: string,
  legendRoom: number
) {
  const open = svg.indexOf('>') + 1
  const head = svg
    .slice(0, open)
    .replace('<svg ', `<svg xmlns="${SVG_NS}" `)
    .replace(
      'width="100%" height="100%"',
      `width="${width}" height="${height}"`
    )
    .replace(/viewBox="[^"]*"/, `viewBox="0 ${-legendRoom} ${width} ${height}"`)
    .replace(' tabindex="0"', '')
    .replace('style="', `style="${rootStyle(frame.fontSize, paint)}`)
  // A painted surface, since PDF and image tools ignore a CSS background.
  const surface = `<rect x="0" y="${-legendRoom}" width="${width}" height="${height}" fill="${paint.surface}"/>`
  return `${head}${haloStyle(paint)}${surface}${legend}${withoutFocusLayers(svg.slice(open))}`
}

function emptySvg(
  message: string,
  { width, height }: StaticRenderOptions,
  frame: PlotFrame,
  paint: ChartPaint
) {
  const text = escapeXml(message)
  return `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${text}" style="${rootStyle(frame.fontSize, paint)}"><text x="0" y="${frame.fontSize * 1.5}" fill="${paint.label}">${text}</text></svg>`
}

export function renderChartSvg<P>(
  chart: ChartDefinition<P>,
  props: P,
  options: StaticRenderOptions
): string {
  const {
    mode,
    accentHue = DEFAULT_ACCENT_HUE,
    width,
    height,
    idPrefix = chart.kind
  } = options
  const paint = hexPaint(mode, accentHue)
  const band = widthBand(width)
  const fullFrame = plotFrame(height, band)
  const empty = chart.emptyMessage(props)
  if (empty) return emptySvg(empty, options, fullFrame, paint)
  const items = placeLegend(
    chart.legend(props, paint, fullFrame),
    width,
    fullFrame
  )
  const rows = items.length ? Math.max(...items.map((i) => i.row)) + 1 : 0
  const legendRoom = rows * LEGEND_ROOM
  const frame = plotFrame(height - legendRoom, band)
  const scene = createChartScene(chart.build(props, paint, frame), {
    width,
    height: frame.height
  })
  const svg = renderSceneSvg(scene, {
    ariaLabel: chart.summary(props),
    idPrefix
  })
  const legend = items.length ? legendRow(items, paint, legendRoom) : ''
  return standalone(svg, options, frame, paint, legend, legendRoom)
}

export type { ChartDefinition } from '../plot/types'
