'use client'

import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type {
  ChartControl,
  ChartRenderContext,
  ChartSvgRenderer
} from '@tanstack/charts'
import type {
  BrushRange,
  BrushXChange
} from '@tanstack/charts/interaction/brush'
import { renderChartSvg } from '@tanstack/charts/svg'
import { type ChartPoint, Chart as EngineChart } from '@tanstack/react-charts'

import type { AbsoluteRange } from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import { ChartCardContext } from '../Chart/context'
import { ChartLegend } from '../ChartLegend'
import { useChartPatterns } from '../ChartPatterns'
import { ChartTooltip } from '../ChartTooltip'
import { ChartState } from './ChartState'
import { withCategoryTitles } from './categoryLabels'
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
  stepRing,
  stepSeries,
  stepWithin,
  visualEnds
} from './keyboard'
import { cssPaint } from './paint'
import { type RangeAxis, spokenRange, spokenValue, wallRange } from './range'
import { type CategoryAxis, type ChartDefinition, isPlotDatum } from './types'
import { useBrushX } from './useBrushX'
import { usePlotBox } from './usePlotBox'

export type ChartPlotProps<P> = {
  chart: ChartDefinition<P>
  props: P
  /** Report the summary and table to a surrounding Chart card. @default true */
  report?: boolean
  /** Overrides the card's plot height, for small multiples. */
  height?: number
  yDomain?: readonly [number, number]
  /** Called with the range a drag, or Shift+Arrow then Enter, selects. */
  onRangeSelect?: (range: AbsoluteRange) => void
  className?: string
}

type RangeValue = number | string
type Selection = {
  range: BrushRange<RangeValue>
  /** Where Shift+Arrow grows the range from. */
  anchor: RangeValue
}

const BRUSH = '[data-chart-brush]'
const RANGE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])

const rangeValueOf = (point: ChartPoint): RangeValue =>
  point.xValue instanceof Date ? point.xValue.getTime() : point.xValue

const inBrush = (target: EventTarget | null) =>
  target instanceof Element && target.closest(BRUSH) !== null

// d3-brush cancels touchmove, which would trap page scroll on the chart, so
// no touch event reaches it; its move and end listeners throw without a
// start. A tap's emulated mousedown follows within a second.
const touchFree = new WeakSet<Element>()
function keepTouchForScrolling(brush: Element) {
  if (touchFree.has(brush)) return
  touchFree.add(brush)
  let touchedAt = -Infinity
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'])
    brush.addEventListener(
      type,
      (event) => {
        touchedAt = event.timeStamp
        event.stopPropagation()
      },
      { capture: true, passive: true }
    )
  brush.addEventListener(
    'mousedown',
    (event) => {
      if (event.timeStamp - touchedAt < 1000) event.stopPropagation()
    },
    { capture: true }
  )
}

// An empty range hides its handles, which would drop their focus to the page.
function keepFocusInPlot(context: ChartRenderContext | null) {
  const plot = context?.surface.element
  if (plot instanceof SVGElement && inBrush(plot.ownerDocument.activeElement))
    plot.focus()
}

// brushX puts each value at its band's centre, which leaves half of each end
// bar out, so a band axis shades the range itself.
function rangeBand(range: BrushRange<RangeValue>): ChartControl {
  return {
    id: 'range-band',
    resolve({ chart, scales }) {
      const x = scales.x
      if (!x) return {}
      const half = x.bandwidth / 2
      const [left, right] = [x.map(range.start), x.map(range.end)].sort(
        (a, b) => a - b
      )
      return {
        nodes: [
          {
            kind: 'rect',
            key: 'range-band',
            ariaHidden: true,
            x: left! - half,
            y: chart.y,
            width: right! - left! + 2 * half,
            height: chart.height,
            style: { fill: cssPaint.highlight, fillOpacity: 0.16 }
          }
        ]
      }
    }
  }
}

function spans(axis: RangeAxis, range: BrushRange<RangeValue>) {
  const start = axis.msOf(range.start)
  const end = axis.msOf(range.end)
  return start !== null && end !== null && start !== end
    ? ([start, end] as const)
    : null
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
  },
  ring: {
    ArrowUp: (points, current) => stepRing(points, current, -1),
    ArrowLeft: (points, current) => stepRing(points, current, -1),
    ArrowDown: (points, current) => stepRing(points, current, 1),
    ArrowRight: (points, current) => stepRing(points, current, 1)
  }
}

// Only charts with category labels pay for the engine's custom-renderer path.
const renderWithTitles: ChartSvgRenderer = (scene, options) =>
  withCategoryTitles(renderChartSvg(scene, options))

const datumsOf = (points: readonly ChartPoint[]) =>
  points.map((p) => p.datum).filter(isPlotDatum)

export function ChartPlot<P>({
  chart,
  props,
  report = true,
  height,
  yDomain,
  onRangeSelect,
  className
}: ChartPlotProps<P>) {
  const card = useContext(ChartCardContext)
  const { patterns, style: patternStyle } = useChartPatterns()
  const hostRef = useRef<HTMLDivElement>(null)
  const renderRef = useRef<ChartRenderContext | null>(null)
  const { band, width, height: measuredHeight, measured } = usePlotBox(hostRef)
  const [focused, setFocused] = useState<ChartPoint | null>(null)
  const [group, setGroup] = useState<readonly ChartPoint[]>([])
  // Hovering moves focus too, but only keyboard focus is spoken; a mouse
  // user with a screen reader shouldn't hear every point they pass over.
  const [spoken, setSpoken] = useState(false)
  const pressedRef = useRef(false)
  const rangeAxis = useMemo(
    () => (onRangeSelect ? (chart.rangeAxis?.(props) ?? null) : null),
    [onRangeSelect, chart, props]
  )
  // New x values are new data, which drops the old selection.
  const axisKey = rangeAxis?.values.join() ?? ''
  const brushX = useBrushX(rangeAxis !== null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [selectionKey, setSelectionKey] = useState(axisKey)
  if (selectionKey !== axisKey) {
    setSelectionKey(axisKey)
    setSelection(null)
  }
  const [rangeSpoken, setRangeSpoken] = useState('')

  const summary = useMemo(() => chart.summary(props), [chart, props])
  const table = useMemo(() => chart.table(props), [chart, props])
  const empty = chart.emptyMessage(props)
  // In a card, CSS sizes the plot and the engine fills it; the measured
  // height only spaces end labels.
  const fillsCard = card !== null && height === undefined
  const fullHeight = height ?? card?.plotHeight ?? DEFAULT_PLOT_HEIGHT
  const legend = card?.hasLegend
    ? []
    : chart.legend(props, cssPaint, plotFrame(fullHeight, band, yDomain, width))
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
  const definition = useMemo(() => {
    if (!drawing || !rangeAxis || !brushX) return drawing?.definition
    const first = rangeAxis.values[0]!
    const onChange = (
      range: BrushRange<RangeValue>,
      { reason }: { reason: BrushXChange<RangeValue> }
    ) => {
      const span = spans(rangeAxis, range)
      // brushX ends a drag whose controlled range stops matching it, so a
      // drag held inside one x is kept too.
      const keep = span || reason.type === 'preview'
      if (!keep) keepFocusInPlot(renderRef.current)
      setSelection(keep ? { range, anchor: range.start } : null)
      setRangeSpoken('')
      if (span && reason.type === 'commit' && reason.source === 'pointer')
        onRangeSelect?.(wallRange(span[0], span[1], rangeAxis.options))
    }
    const brush = brushX<RangeValue>({
      values: rangeAxis.values,
      range: {
        value: selection?.range ?? { start: first, end: first },
        onChange
      },
      ariaLabel: 'Selected range',
      startAriaLabel: 'Range start',
      endAriaLabel: 'Range end',
      format: (value) => {
        const ms = rangeAxis.msOf(value)
        return ms === null ? String(value) : spokenValue(ms, rangeAxis.options)
      }
    })
    const band = rangeAxis.bands && selection && rangeBand(selection.range)
    return {
      ...drawing.definition,
      controls: [
        ...(drawing.definition.controls ?? []),
        ...(band ? [band] : []),
        brush
      ]
    }
  }, [drawing, rangeAxis, brushX, selection, onRangeSelect])
  const fail = drawing ? undefined : card?.fail
  useLayoutEffect(() => fail?.(), [fail])

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

  function applyRange() {
    const span = rangeAxis && selection && spans(rangeAxis, selection.range)
    if (!span) return false
    onRangeSelect?.(wallRange(span[0], span[1], rangeAxis.options))
    return true
  }

  function clearRange() {
    if (!selection) return false
    keepFocusInPlot(renderRef.current)
    setSelection(null)
    setRangeSpoken('Selection cleared')
    return true
  }

  // Shift+Arrow grows the brush from where it started, so the brush's own
  // handles aren't the only way in for the keyboard.
  function growRange(next: ChartPoint) {
    if (!rangeAxis) return
    const anchor = selection?.anchor ?? (focused && rangeValueOf(focused))
    if (anchor == null) return
    const end = rangeValueOf(next)
    const span = spans(rangeAxis, { start: anchor, end })
    if (!span) {
      setSelection(null)
      setRangeSpoken('')
      return
    }
    const range =
      span[0] <= span[1] ? { start: anchor, end } : { start: end, end: anchor }
    setSelection({ range, anchor })
    setRangeSpoken(spokenRange(span[0], span[1], rangeAxis.options))
  }

  // Runs before the brush handles' own keys, which move them.
  function onRangeKey(event: KeyboardEvent<HTMLDivElement>) {
    const handled =
      (event.key === 'Enter' && applyRange()) ||
      (event.key === 'Escape' && clearRange())
    if (!handled) return false
    event.preventDefault()
    event.stopPropagation()
    return true
  }

  // The engine walks every arrow key along one list: column tops on an x
  // category axis, bar values on a y one. That loses the series after a step
  // between series and the category order on horizontal bars, and its Home and
  // End follow the same list, so steps and ends run on screen position here.
  function onKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    setSpoken(true)
    if (rangeAxis && onRangeKey(event)) return
    if (inBrush(event.target)) return
    const growing =
      rangeAxis !== null && event.shiftKey && RANGE_KEYS.has(event.key)
    if (!growing) setRangeSpoken('')
    const move = (point: ChartPoint) => {
      focusPoint(point)
      if (growing) growRange(point)
    }
    const points = plotPoints()
    if (event.key === 'Home' || event.key === 'End') {
      const ends = visualEnds(points, axis)
      if (!ends) return
      event.preventDefault()
      event.stopPropagation()
      move(event.key === 'Home' ? ends.first : ends.last)
      return
    }
    const step = ARROW_STEPS[axis][event.key]
    const current = focused && points.find((p) => p.key === focused.key)
    if (!step || !current) return
    event.preventDefault()
    event.stopPropagation()
    const next = step(points, current)
    if (next) move(next)
  }

  // The brush covers the plot, and the engine drops hover and taps over a
  // control, so the tooltip follows the pointer from here.
  function followPointer(event: PointerEvent<HTMLDivElement>) {
    if (!rangeAxis || !inBrush(event.target)) return
    const interaction = renderRef.current?.interaction
    interaction?.setControlledFocus(
      interaction.resolvePointer(event.clientX, event.clientY),
      { source: 'pointer' }
    )
  }

  // Runs before the engine's own focusin, which skips entry once a point is set.
  function onFocusCapture(event: FocusEvent<HTMLDivElement>) {
    setSpoken(!pressedRef.current)
    pressedRef.current = false
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

  if (empty) return <ChartState height={height}>{empty}</ChartState>
  if (!drawing)
    return (
      <ChartState error height={height}>
        {DRAW_ERROR}
      </ChartState>
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
        data-range={rangeAxis ? (selection ? 'held' : 'empty') : undefined}
        data-range-shape={rangeAxis?.bands ? 'bands' : undefined}
        className='relative'
        onKeyDownCapture={onKeyDownCapture}
        onFocusCapture={onFocusCapture}
        onPointerDownCapture={() => {
          pressedRef.current = true
          setSpoken(false)
        }}
        onPointerDown={(event) => {
          if (event.pointerType === 'touch') followPointer(event)
        }}
        onPointerMove={(event) => {
          setSpoken(false)
          followPointer(event)
        }}
        // A tap leaves as the finger lifts, and its tooltip should stay.
        onPointerLeave={(event) => {
          if (rangeAxis && focused && event.pointerType !== 'touch')
            focusPoint(null)
        }}
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
          definition={definition ?? drawing.definition}
          renderSvg={axis === 'y' ? renderWithTitles : undefined}
          height={fillsCard ? undefined : frame.height}
          style={fillsCard ? { height: '100%' } : undefined}
          initialWidth={INITIAL_WIDTH}
          ariaLabel={summary}
          onFocusChange={setFocused}
          onFocusGroupChange={setGroup}
          onRender={(context) => {
            renderRef.current = context
            const brush = context.container.querySelector<HTMLElement>(BRUSH)
            if (!brush) return
            brush.style.touchAction = 'auto'
            keepTouchForScrolling(brush)
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
        {spoken &&
          (rangeSpoken ||
            (focusedDatum ? chart.describe(focusedDatum, props) : ''))}
      </p>
    </div>
  )
}
