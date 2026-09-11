'use client'

import { type ComponentProps, useSyncExternalStore } from 'react'

import {
  type DateStyle,
  type FormatOptions,
  type Instantish,
  type TimeStyle,
  formatDateRangeParts,
  formatDateTime,
  formatDurationDays,
  formatMachine,
  formatRelative,
  formatTimeOfDay,
  separators
} from '@oztix/roadie-core/datetime'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import { subscribeToTicker } from '../../utils/ticker'

/** A non-relative DateTime never changes, so it subscribes to nothing. */
const subscribeToNothing = () => () => {}

/**
 * Typed against `HTMLElement`, not `HTMLTimeElement`, and without a `ref`.
 *
 * A single moment renders a `time`, but a range renders a `span` wrapping one
 * `time` per end, because `time` cannot nest. Which one you get depends on the
 * values, not the props: `to` on the same day as `at` collapses back to a
 * single moment. A discriminated union would therefore promise a root element
 * the component cannot guarantee, so the shared shape is the honest one.
 *
 * Use `render` when you need the element itself.
 */
export interface DateTimeProps extends Omit<
  ComponentProps<'time'>,
  'dateTime' | 'children' | 'ref'
> {
  /** The moment. A Date, or anything carrying `epochMilliseconds`. */
  at: Instantish
  /**
   * A later moment, making this a range. Both ends are formatted together, so
   * the year rides on the later date. Two ends on the same day render as a
   * time range when a `timeStyle` is set, and collapse to one moment without
   * one.
   */
  to?: Instantish | null
  /**
   * IANA zone. The venue's for an event time, the viewer's for a timestamp.
   * See /foundations/date-and-time.
   */
  timeZone: string
  dateStyle?: DateStyle
  /** Omit for a date with no time. */
  timeStyle?: TimeStyle
  locale?: string
  context?: FormatOptions['context']
  /**
   * Render as elapsed time, falling back to the absolute past the cutoff and
   * keeping it in `title`. Timestamps only, single moments only.
   */
  relative?: boolean
  /** Overrides the relative cutoff. Defaults to seven days. */
  cutoffMs?: number
  /**
   * The range is one night, even though it crosses midnight. Says the date once
   * and leaves the end a bare time, while both `time` elements keep their real
   * instant.
   *
   * A fact about the event, not a formatting choice, so it is passed in rather
   * than inferred. Where a night ends is a business rule.
   */
  sameNight?: boolean
  /**
   * On a range, append the calendar days it covers after a middot. Renders
   * nothing inside a single day, or past 30 days, where a count stops telling
   * the reader anything.
   */
  showDuration?: boolean
  /**
   * Swap the rendered element. Use the function form inside an SVG chart, where
   * `time` is invalid and only `time` may carry the machine value:
   * `render={({ dateTime, ...rest }) => <text {...rest} />}`
   */
  render?: RoadieRenderProp
}

/**
 * A moment, or a span between two, rendered as a `time` element.
 *
 * Sets `dateTime` to a value carrying the zone's offset, so the markup
 * identifies an instant rather than a floating local time. Covers dates too:
 * `time` has always represented both.
 */
export function DateTime({
  at,
  to,
  timeZone,
  dateStyle,
  timeStyle,
  locale,
  context,
  relative,
  cutoffMs,
  sameNight,
  showDuration,
  render,
  ...props
}: DateTimeProps) {
  const opts: FormatOptions = {
    timeZone,
    dateStyle,
    timeStyle,
    locale,
    context
  }

  const absolute = formatDateTime(at, opts)
  const machine = formatMachine(at, opts)

  // The rendered string is the snapshot, not the clock, so React re-renders
  // only when the words change: once a minute at most, and never at all once
  // the moment is past the cutoff and the text is a fixed date.
  //
  // Subscribing to the shared ticker rather than owning an interval means a
  // list of audit rows starts one timer between them, and that timer stops
  // while the tab is hidden.
  const subscribe = relative ? subscribeToTicker : subscribeToNothing
  const elapsed = useSyncExternalStore(
    subscribe,
    () => (relative ? formatRelative(at, { ...opts, cutoffMs }) : null),
    // The server has no clock worth trusting, so it renders the absolute and
    // the client swaps in after mount. No hydration mismatch to suppress.
    () => null
  )

  // One night crossing midnight says the date once, so `render` swaps the
  // wrapper rather than the `time` elements inside it.
  if (to && sameNight && timeStyle) {
    const endTime = formatTimeOfDay(to, opts)
    if (absolute !== null && endTime !== null) {
      return resolveRender(
        'span',
        {
          ...props,
          children: (
            <>
              <time dateTime={machine ?? undefined}>{absolute}</time>
              {` ${separators.range} `}
              <time dateTime={formatMachine(to, opts) ?? undefined}>
                {endTime}
              </time>
            </>
          )
        },
        render
      )
    }
  }

  const range = to ? formatDateRangeParts(at, to, opts) : null
  if (to && range && range.to !== null) {
    const duration = showDuration ? formatDurationDays(at, to, opts) : null
    const toMachine = formatMachine(to, opts)
    return resolveRender(
      'span',
      {
        ...props,
        children: (
          <>
            <time dateTime={machine ?? undefined}>{range.from}</time>
            {` ${separators.range} `}
            <time dateTime={toMachine ?? undefined}>{range.to}</time>
            {duration ? ` ${separators.fact} ${duration}` : null}
          </>
        )
      },
      render
    )
  }

  const text = relative ? (elapsed ?? absolute) : absolute
  // Spread after `...props`, so it must fall back rather than clobber a
  // caller's own title with undefined.
  const title =
    relative && elapsed && elapsed !== absolute
      ? (absolute ?? props.title)
      : props.title

  if (text === null) return null

  return resolveRender(
    'time',
    {
      ...props,
      dateTime: machine ?? undefined,
      title,
      children: text
    },
    render
  )
}

DateTime.displayName = 'DateTime'
