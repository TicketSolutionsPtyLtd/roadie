import { scaleLinear } from '@tanstack/charts/scales/linear'

import { type XFormat, formatX } from '@oztix/roadie-core/dataviz'

import {
  eventTimeTicks,
  formatTimeTick,
  formatTimeTitle,
  hasTimeOfDay,
  isTimeField,
  timeTicks
} from './time'
import type { PlotFrame, Row } from './types'
import { xLabel } from './words'

type XAxisProps = { data: readonly Row[]; x: string; xFormat?: XFormat }

function tickValues(props: XAxisProps, [min, max]: readonly [number, number]) {
  if (isTimeField(props.data, props.x))
    return timeTicks(min, max, {
      hasTime: hasTimeOfDay(props.data[0]?.[props.x])
    })
  if (props.xFormat === 'eventTime') return eventTimeTicks(min, max)
  return undefined
}

/** A time or numeric x along the bottom, its ends kept inside the plot. */
export function xAxisScale(
  props: XAxisProps,
  domain: readonly [number, number],
  frame: PlotFrame
) {
  const isTime = isTimeField(props.data, props.x)
  const span = domain[1] - domain[0]
  const values = tickValues(props, domain)
  return {
    scale: scaleLinear().domain(domain),
    axis: {
      line: false,
      ticks: {
        ...(values && { values }),
        size: 0,
        format: (value: number) =>
          isTime
            ? formatTimeTick(value, span)
            : formatX(value, props.xFormat, 'tick')
      },
      tickLabels: {
        fontSize: frame.fontSize,
        anchor: ({ value }: { value: unknown }) =>
          value === domain[0] ? 'start' : value === domain[1] ? 'end' : 'middle'
      }
    }
  } as const
}

/** The x of a tooltip title: a full date, or the x in its format. */
export function xTitle(props: XAxisProps, x: number | string) {
  if (typeof x !== 'number') return x
  return isTimeField(props.data, props.x)
    ? formatTimeTitle(x, hasTimeOfDay(props.data[0]?.[props.x]))
    : xLabel(x, props.xFormat)
}
