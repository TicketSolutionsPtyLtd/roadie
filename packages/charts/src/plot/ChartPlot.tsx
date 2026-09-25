'use client'

import {
  type KeyboardEvent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type { ChartRenderContext } from '@tanstack/charts'
import { type ChartPoint, Chart as EngineChart } from '@tanstack/react-charts'

import { cn } from '@oztix/roadie-core/utils'

import { ChartCardContext } from '../Chart/context'
import { ChartLegend } from '../ChartLegend'
import { useChartPatterns } from '../ChartPatterns'
import { ChartTooltip } from '../ChartTooltip'
import {
  DEFAULT_PLOT_HEIGHT,
  INITIAL_WIDTH,
  LEGEND_ROOM,
  plotFrame
} from './frame'
import { stepAlong, stepCategory, stepSeries, stepWithin } from './keyboard'
import { cssPaint } from './paint'
import { type CategoryAxis, type ChartDefinition, isPlotDatum } from './types'
import { useWidthBand } from './useWidthBand'

export type ChartPlotProps<P> = {
  chart: ChartDefinition<P>
  props: P
  /** Report the summary and table to a surrounding Chart card. @default true */
  report?: boolean
  /** Overrides the card's plot height, for small multiples. */
  height?: number
  yDomain?: readonly [number, number]
  className?: string
}

type Step = (
  points: readonly ChartPoint[],
  current: ChartPoint
) => ChartPoint | null

const ARROW_STEPS: Record<CategoryAxis, Partial<Record<string, Step>>> = {
  x: {
    ArrowUp: (points, current) => stepSeries(points, current, -1),
    ArrowDown: (points, current) => stepSeries(points, current, 1),
    ArrowLeft: (points, current) => stepAlong(points, current, -1),
    ArrowRight: (points, current) => stepAlong(points, current, 1)
  },
  y: {
    ArrowUp: (points, current) => stepCategory(points, current, -1),
    ArrowDown: (points, current) => stepCategory(points, current, 1),
    ArrowLeft: (points, current) => stepWithin(points, current, -1),
    ArrowRight: (points, current) => stepWithin(points, current, 1)
  }
}

const datumsOf = (points: readonly ChartPoint[]) =>
  points.map((p) => p.datum).filter(isPlotDatum)

export function ChartPlot<P>({
  chart,
  props,
  report = true,
  height,
  yDomain,
  className
}: ChartPlotProps<P>) {
  const card = useContext(ChartCardContext)
  const { patterns, style: patternStyle } = useChartPatterns()
  const hostRef = useRef<HTMLDivElement>(null)
  const renderRef = useRef<ChartRenderContext | null>(null)
  const band = useWidthBand(hostRef)
  const [focused, setFocused] = useState<ChartPoint | null>(null)
  const [group, setGroup] = useState<readonly ChartPoint[]>([])

  const summary = useMemo(() => chart.summary(props), [chart, props])
  const table = useMemo(() => chart.table(props), [chart, props])
  const empty = chart.emptyMessage(props)
  const fullHeight = height ?? card?.plotHeight ?? DEFAULT_PLOT_HEIGHT
  const legend = chart.legend(
    props,
    cssPaint,
    plotFrame(fullHeight, band, yDomain)
  )
  const plotHeight = legend.length ? fullHeight - LEGEND_ROOM : fullHeight
  const frame = useMemo(
    () => plotFrame(plotHeight, band, yDomain),
    [plotHeight, band, yDomain]
  )
  const definition = useMemo(
    () => chart.build(props, cssPaint, frame),
    [chart, props, frame]
  )

  const reporter = report ? card?.report : undefined
  useEffect(() => {
    reporter?.({ summary, table })
    return () => reporter?.(null)
  }, [reporter, summary, table])

  const focusedDatum =
    focused && isPlotDatum(focused.datum) ? focused.datum : null
  const tooltip =
    focused && focusedDatum
      ? chart.tooltip(
          datumsOf(group.length ? group : [focused]),
          props,
          cssPaint
        )
      : null

  // The engine walks every arrow key along one list of column tops, so after
  // stepping to a lower series its left and right would jump back to the start.
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    const step = ARROW_STEPS[chart.categoryAxis?.(props) ?? 'x'][event.key]
    const points = renderRef.current?.scene.points ?? []
    const current = focused && points.find((p) => p.key === focused.key)
    if (!step || !current) return
    event.preventDefault()
    event.stopPropagation()
    const next = step(points, current)
    if (next)
      renderRef.current?.interaction.setControlledFocus(next, {
        source: 'programmatic'
      })
  }

  if (empty)
    return (
      <p data-slot='chart-empty' className='text-sm text-subtle'>
        {empty}
      </p>
    )

  return (
    <div
      className={cn('grid gap-2', className)}
      style={card ? undefined : patternStyle}
    >
      {legend.length > 0 && <ChartLegend items={legend} />}
      <div
        ref={hostRef}
        data-slot='chart-plot-host'
        className='relative'
        onKeyDownCapture={onKeyDownCapture}
      >
        {!card && patterns}
        <EngineChart
          definition={definition}
          height={frame.height}
          initialWidth={INITIAL_WIDTH}
          ariaLabel={summary}
          onFocusChange={setFocused}
          onFocusGroupChange={setGroup}
          onRender={(context) => {
            renderRef.current = context
          }}
        />
        {focused && tooltip && (
          <ChartTooltip
            data-slot='chart-plot-tooltip'
            aria-hidden
            title={tooltip.title}
            rows={tooltip.rows}
            className='pointer-events-none absolute z-10 w-max -translate-x-1/2 -translate-y-[calc(100%+8px)] motion-safe:transition-transform'
            style={{ left: focused.x, top: focused.y }}
          />
        )}
      </div>
      <p
        data-slot='chart-plot-announcement'
        aria-live='polite'
        className='sr-only'
      >
        {focusedDatum ? chart.describe(focusedDatum, props) : ''}
      </p>
    </div>
  )
}
