import { barChart } from '../BarChart/definition'
import { lineChart } from '../LineChart/definition'
import { hexPaint } from '../plot/paint'
import { FONT_FAMILY, SVG_NS, escapeXml } from '../plot/svg'
import { type StaticRenderOptions, renderChartSvg } from '../static'
import { emptyMessage } from './empty'
import { PANEL_HEIGHT, panelsOf, sharedDomain } from './panels'
import { smallMultiplesSummary } from './summary'
import type { SmallMultiplesProps } from './types'

const GAP = 16
const CAPTION = 20

export function renderSmallMultiplesSvg(
  props: SmallMultiplesProps,
  {
    columns = 2,
    width,
    mode,
    accentHue
  }: Omit<StaticRenderOptions, 'height'> & { columns?: number }
) {
  const panels = panelsOf(props)
  const { label, surface } = hexPaint(mode, accentHue)
  if (panels.length === 0) {
    const message = escapeXml(emptyMessage(props))
    return `<svg xmlns="${SVG_NS}" width="${width}" height="${PANEL_HEIGHT}" viewBox="0 0 ${width} ${PANEL_HEIGHT}" role="img" aria-label="${message}" style="font-family:${FONT_FAMILY}"><rect width="${width}" height="${PANEL_HEIGHT}" fill="${surface}"/><text x="0" y="18" font-size="12" fill="${label}">${message}</text></svg>`
  }
  const panelWidth = (width - GAP * (columns - 1)) / columns
  const rows = Math.ceil(panels.length / columns)
  const height = rows * (PANEL_HEIGHT + CAPTION) + GAP * (rows - 1)
  const domain = sharedDomain(props)
  const { chart } = props
  const inner = panels.map((panel, i) => {
    const x = (i % columns) * (panelWidth + GAP)
    const y = Math.floor(i / columns) * (PANEL_HEIGHT + CAPTION + GAP)
    const options = {
      mode,
      accentHue,
      width: panelWidth,
      height: PANEL_HEIGHT,
      idPrefix: `panel-${i}`
    }
    const svg =
      chart.kind === 'line'
        ? renderChartSvg(
            {
              ...lineChart,
              build: (p, paint, frame) =>
                lineChart.build(p, paint, { ...frame, yDomain: domain })
            },
            { ...chart, data: panel.rows },
            options
          )
        : renderChartSvg(
            {
              ...barChart,
              build: (p, paint, frame) =>
                barChart.build(p, paint, { ...frame, yDomain: domain })
            },
            { ...chart, data: panel.rows },
            options
          )
    return `<text x="${x}" y="${y + 14}" font-size="12" font-weight="600" fill="${label}">${escapeXml(panel.key)}</text><g transform="translate(${x} ${y + CAPTION})">${svg}</g>`
  })
  return `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(smallMultiplesSummary(props))}" style="font-family:${FONT_FAMILY}"><rect width="${width}" height="${height}" fill="${surface}"/>${inner.join('')}</svg>`
}
