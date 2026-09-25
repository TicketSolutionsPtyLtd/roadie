'use client'

import {
  type FocusEvent,
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
import { DRAW_ERROR, draw } from './draw'
import {
  DEFAULT_PLOT_HEIGHT,
  INITIAL_WIDTH,
  LEGEND_ROOM,
  plotFrame
} from './frame'
import {
  stepAlong,
  stepCategory,
  stepSeries,
  stepWithin,
  visualEnds
} from './keyboard'
import { cssPaint } from './paint'
import { type CategoryAxis, type ChartDefinition, isPlotDatum } from './types'
import { usePlotBox } from './usePlotBox'

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
  const { band, width, height: measuredHeight, measured } = usePlotBox(hostRef)
  const [focused, setFocused] = useState<ChartPoint | null>(null)
  const [group, setGroup] = useState<readonly ChartPoint[]>([])

  const summary = useMemo(() => chart.summary(props), [chart, props])
  const table = useMemo(() => chart.table(props), [chart, props])
  const empty = chart.emptyMessage(props)
  // In a card, CSS sizes the plot and the engine fills it; the measured
  // height only spaces end labels.
  const fillsCard = card !== null && height === undefined
  const fullHeight = height ?? card?.plotHeight ?? DEFAULT_PLOT_HEIGHT
  const legend = chart.legend(
    props,
    cssPaint,
    plotFrame(fullHeight, band, yDomain, width)
  )
  const fixedHeight = legend.length ? fullHeight - LEGEND_ROOM : fullHeight
  const plotHeight = (fillsCard && measuredHeight) || fixedHeight
  const frame = useMemo(
    () => plotFrame(plotHeight, band, yDomain, width),
    [plotHeight, band, yDomain, width]
  )
  const drawing = useMemo(
    () => draw(chart, props, cssPaint, frame),
    [chart, props, frame]
  )
  const fail = drawing ? undefined : card?.fail
  useEffect(() => fail?.(), [fail])

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

  const axis = chart.categoryAxis?.(props) ?? 'x'
  const plotPoints = () => renderRef.current?.scene.points ?? []
  const focusPoint = (point: ChartPoint | null) =>
    renderRef.current?.interaction.setControlledFocus(point, {
      source: 'programmatic'
    })

  // The engine walks every arrow key along one list: column tops on an x
  // category axis, bar values on a y one. That loses the series after a step
  // between series and the category order on horizontal bars, and its Home and
  // End follow the same list, so steps and ends run on screen position here.
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    const points = plotPoints()
    if (event.key === 'Home' || event.key === 'End') {
      const ends = visualEnds(points, axis)
      if (!ends) return
      event.preventDefault()
      event.stopPropagation()
      focusPoint(event.key === 'Home' ? ends.first : ends.last)
      return
    }
    const step = ARROW_STEPS[axis][event.key]
    const current = focused && points.find((p) => p.key === focused.key)
    if (!step || !current) return
    event.preventDefault()
    event.stopPropagation()
    const next = step(points, current)
    if (next) focusPoint(next)
  }

  // Runs before the engine's own focusin, which skips entry once a point is set.
  function onFocusCapture(event: FocusEvent<HTMLDivElement>) {
    if (focused || event.target !== renderRef.current?.surface.element) return
    const ends = visualEnds(plotPoints(), axis)
    if (ends) focusPoint(ends.first)
  }

  // The engine keeps a controlled point when focus leaves, so clear it here.
  // A blur that leaves the chart active is the window losing focus, not the
  // reader leaving, so the point stays for when they come back.
  function onBlur(event: FocusEvent<HTMLDivElement>) {
    const host = event.currentTarget
    if (
      !focused ||
      host.contains(event.relatedTarget) ||
      host.contains(host.ownerDocument.activeElement)
    )
      return
    focusPoint(null)
  }

  if (empty || !drawing)
    return (
      <p
        data-slot={empty ? 'chart-empty' : 'chart-error'}
        className='text-sm text-subtle'
      >
        {empty ?? DRAW_ERROR}
      </p>
    )

  return (
    <div
      className={cn(
        'grid gap-2',
        fillsCard &&
          (legend.length
            ? 'h-full grid-rows-[auto_minmax(0,1fr)]'
            : 'h-full grid-rows-[minmax(0,1fr)]'),
        className
      )}
      style={card ? undefined : patternStyle}
    >
      {legend.length > 0 && <ChartLegend items={legend} />}
      <div
        ref={hostRef}
        data-slot='chart-plot-host'
        className='relative'
        onKeyDownCapture={onKeyDownCapture}
        onFocusCapture={onFocusCapture}
        onBlur={onBlur}
      >
        {!card && patterns}
        <EngineChart
          // Server and first client markup is drawn at the engine's default
          // size, so it stays hidden until the box is measured.
          className={cn(
            'motion-safe:transition-opacity',
            !measured && 'opacity-0'
          )}
          definition={drawing.definition}
          height={fillsCard ? undefined : frame.height}
          style={fillsCard ? { height: '100%' } : undefined}
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
