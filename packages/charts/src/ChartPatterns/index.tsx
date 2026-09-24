import { type CSSProperties, type ReactElement, useId, useMemo } from 'react'

export const CHART_TEXTURE_COUNT = 8

export const chartTextureId = (slot: number) => `roadie-texture-${slot}`

const PATTERNS: readonly ReactElement[] = [
  <path key='1' d='M-1 1l2-2M0 6l6-6M5 7l2-2' />,
  <circle key='2' cx={3} cy={3} r={1.1} fill='currentColor' stroke='none' />,
  <path key='3' d='M0 0l6 6M6 0L0 6' />,
  <path key='4' d='M0 3h6' />,
  <path key='5' d='M3 0v6' />,
  <path key='6' d='M0 3h6M3 0v6' />,
  <path key='7' d='M-1 5l2 2M0 0l6 6M5 -1l2 2' />,
  <path key='8' d='M0 4q1.5-3 3 0t3 0' />
]

function defs(idFor: (slot: number) => string) {
  return (
    <svg
      aria-hidden
      width={0}
      height={0}
      className='absolute'
      focusable={false}
    >
      <defs>
        {PATTERNS.map((shape, i) => (
          <pattern
            key={idFor(i + 1)}
            id={idFor(i + 1)}
            width={6}
            height={6}
            patternUnits='userSpaceOnUse'
          >
            <g fill='none' stroke='currentColor' strokeWidth={1.2}>
              {shape}
            </g>
          </pattern>
        ))}
      </defs>
    </svg>
  )
}

/**
 * Shared, page-wide texture patterns at fixed ids. Render once per page,
 * near the root — a second copy repeats the ids. `fill-texture-*` and the
 * forced-colours rules fall back to these ids when no closer instance has
 * set the `--chart-texture-*` custom properties (see `useChartPatterns`).
 */
export function ChartPatterns() {
  return defs(chartTextureId)
}
ChartPatterns.displayName = 'ChartPatterns'

/**
 * Textures scoped to one chart instance, so several charts on the same page
 * never repeat ids. Spread `style` onto an element that contains both the
 * plot and any legend swatches using `fill-texture-*` or `data-chart-texture`
 * — they read it through inheritance — and render `patterns` anywhere in
 * that same subtree.
 */
export function useChartPatterns(): {
  patterns: ReactElement
  style: CSSProperties
} {
  // useId's `:` characters are valid in an HTML id but risk trouble unquoted
  // inside url(#...); strip them rather than rely on browsers to cope.
  const uid = useId().replace(/:/g, '')
  const idFor = (slot: number) => `${uid}-texture-${slot}`
  const style = useMemo(() => {
    const vars: Record<string, string> = {}
    for (let slot = 1; slot <= CHART_TEXTURE_COUNT; slot++)
      vars[`--chart-texture-${slot}`] = `url(#${idFor(slot)})`
    return vars as CSSProperties
  }, [uid])
  return { patterns: defs(idFor), style }
}
