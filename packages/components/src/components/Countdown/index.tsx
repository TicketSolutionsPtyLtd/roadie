'use client'

import { type ComponentProps, useSyncExternalStore } from 'react'

import NumberFlow, { NumberFlowGroup } from '@number-flow/react'

import {
  type DurationStyle,
  type Instantish,
  formatDuration,
  formatMachineDuration
} from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import { subscribeToTicker } from '../../utils/ticker'

/** Below this, a deadline is urgent enough to warrant a ticking clock. */
const DEFAULT_URGENT_BELOW_MS = 5 * 60_000

export type CountdownSeconds = 'urgent' | 'always' | 'never'

export type CountdownDisplay = 'auto' | 'coarse' | 'clock' | 'segments'

export type CountdownUrgency = 'success' | 'warning' | 'danger' | 'expired'

export type UrgencyThresholds = {
  /** Below this, the wait is worth noticing. Defaults to five minutes. */
  warnBelowMs?: number
  /** Below this, it is nearly gone. Defaults to two minutes. */
  dangerBelowMs?: number
}

/**
 * Where a countdown sits on the urgency scale.
 *
 * Put the result on the container, never on the digits. A Badge or a Card
 * carries intent; a `time` element is text.
 */
export function countdownUrgency(
  ms: number | null,
  {
    warnBelowMs = 5 * 60_000,
    dangerBelowMs = 2 * 60_000
  }: UrgencyThresholds = {}
): CountdownUrgency {
  if (ms === null) return 'success'
  // Fail safe: an unparseable value reads as gone, never as plenty of time.
  if (!Number.isFinite(ms)) return 'expired'
  if (ms <= 0) return 'expired'
  if (ms < dangerBelowMs) return 'danger'
  if (ms < warnBelowMs) return 'warning'
  return 'success'
}

/**
 * Urgency for a moment, updated as it approaches.
 *
 * Shares the one page-wide ticker, so escalating a container's intent costs no
 * extra timer. The value only changes at a threshold, so the parent re-renders
 * three times over a whole countdown rather than once a second.
 */
export function useCountdownUrgency(
  until: Instantish,
  thresholds: UrgencyThresholds = {}
): CountdownUrgency {
  const target = toMs(until)
  const { warnBelowMs = 5 * 60_000, dangerBelowMs = 2 * 60_000 } = thresholds
  return useSyncExternalStore(
    subscribeToTicker,
    () => countdownUrgency(target - Date.now(), { warnBelowMs, dangerBelowMs }),
    () => 'success' as CountdownUrgency
  )
}

export interface CountdownProps extends Omit<
  ComponentProps<'time'>,
  'dateTime' | 'children'
> {
  /**
   * The moment being counted to. A value that cannot be read as an instant
   * reads as expired, never as plenty of time.
   */
  until: Instantish
  /**
   * When to show a ticking clock rather than a coarse count of minutes.
   *
   * - `urgent` (default) counts minutes until the deadline is close, then
   *   switches. For a held cart or a closing sale, where a clock running from
   *   the start manufactures anxiety the situation does not warrant.
   * - `always` ticks from the start. For something a person is waiting *for*,
   *   like a registration or an on sale, where the seconds are the point.
   * - `never` stays coarse. For a countdown measured in hours or days.
   */
  seconds?: CountdownSeconds
  /**
   * The shape of the count.
   *
   * - `auto` (default) picks one: words when it is not ticking, a clock when
   *   it is and there is under an hour left, segments beyond that.
   * - `segments` is the days / hours / mins / secs breakdown. For a long wait
   *   somebody is looking forward to, where losing the days would be absurd.
   * - `clock` is `4:32`, growing an hour field when it needs one.
   * - `coarse` is words only.
   */
  display?: CountdownDisplay
  /**
   * How the coarse register words itself. `long` reads '8 minutes', `medium`
   * reads '8 mins', `short` reads '8m'. Matches Duration and formatDuration.
   *
   * The segmented display is unaffected: its units are always single letters,
   * because they sit against the digits rather than in a sentence.
   */
  durationStyle?: DurationStyle
  /** Threshold for `seconds='urgent'`. Defaults to five minutes. */
  urgentBelowMs?: number
  /**
   * Rendered once the moment has passed. Without it the countdown falls
   * through to its usual shape at zero, so a clock reads '0:00' and a coarse
   * register reads '0 minutes'.
   *
   * Prefer a word. 'Expired' or 'Closed' tells the reader what happened, where
   * a stopped clock leaves them to work it out.
   */
  expiredLabel?: string
  /**
   * Announce progress to assistive tech, coarsely. Defaults to true.
   * Never per second: that is unusable.
   */
  announce?: boolean
}

function toMs(at: Instantish): number {
  return at instanceof Date ? at.getTime() : at.epochMilliseconds
}

/**
 * Time remaining, rendered as a `time` element.
 *
 * Performance is the reason this is a component rather than a pattern. Every
 * countdown on the page shares one interval, it stops while the tab is hidden,
 * and the snapshot is bucketed to the value actually displayed. In the coarse
 * register that means one render a minute rather than sixty.
 */
export function Countdown({
  until,
  seconds = 'urgent',
  display = 'auto',
  durationStyle,
  urgentBelowMs = DEFAULT_URGENT_BELOW_MS,
  expiredLabel,
  announce = true,
  className,
  ...props
}: CountdownProps) {
  const target = toMs(until)

  // The snapshot is the value on screen, not the clock, so React bails out of
  // the other fifty-nine renders a minute.
  const bucket = useSyncExternalStore(
    subscribeToTicker,
    () => snapshot(target, seconds, urgentBelowMs, Date.now(), display),
    // The server has no clock worth trusting; render the first client value.
    () => null
  )

  if (bucket === null) return null

  // Fail safe, the way countdownUrgency does: an unparseable target reads as
  // gone, never as plenty of time.
  const expired = bucket <= 0
  const ticking = isTicking(bucket, seconds, urgentBelowMs)
  const shape = resolveDisplay(display, ticking, bucket)
  const machine = formatMachineDuration(bucket)

  return (
    <time
      dateTime={machine ?? undefined}
      className={cn('tabular-nums', className)}
      {...props}
    >
      {announce && (
        <span className='sr-only' aria-live='polite' aria-atomic='true'>
          {expired
            ? (expiredLabel ?? 'No time remaining')
            : coarseAnnouncement(bucket)}
        </span>
      )}
      {/* Never render nothing at zero. Vanishing leaves whatever contains this,
          a Badge or a Card, as an empty shell that reads as a broken layout.
          Without a label it falls through to the same renderer, so a countdown
          that never showed seconds does not suddenly show 0:00. */}
      {expired && expiredLabel ? (
        <span aria-hidden='true'>{expiredLabel}</span>
      ) : shape === 'segments' ? (
        <Segments ms={bucket} />
      ) : shape === 'clock' ? (
        <Clock ms={bucket} />
      ) : (
        <Coarse ms={bucket} durationStyle={durationStyle} />
      )}
    </time>
  )
}

/**
 * A countdown only ever descends, including across a rollover. Without this the
 * default trend flips sign at 59 to 00 and the digit spins upward.
 */
const DESCENDING = -1

/** Position 0 is the ones column, 1 the tens. A sexagesimal tens digit stops at 5. */
const SEXAGESIMAL = { 1: { max: 5 } }

function Clock({ ms }: { ms: number }) {
  const total = Math.floor(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return (
    // Grouped so the fields transition together, or the row wobbles.
    <NumberFlowGroup>
      <span aria-hidden='true'>
        {hours > 0 && (
          <>
            <NumberFlow value={hours} trend={DESCENDING} willChange />:
          </>
        )}
        <NumberFlow
          value={minutes}
          trend={DESCENDING}
          digits={SEXAGESIMAL}
          format={hours > 0 ? { minimumIntegerDigits: 2 } : undefined}
          willChange
        />
        :
        <NumberFlow
          value={secs}
          trend={DESCENDING}
          digits={SEXAGESIMAL}
          format={{ minimumIntegerDigits: 2 }}
          willChange
        />
      </span>
    </NumberFlowGroup>
  )
}

// Animating a value that changes once a minute buys nothing and costs a frame
// budget on every card in a list.
function Coarse({
  ms,
  durationStyle
}: {
  ms: number
  durationStyle?: DurationStyle
}) {
  // Round up: a countdown should never claim less time than there is.
  const rounded = Math.ceil(ms / 60_000) * 60_000
  // formatDuration(0) reads 'less than a minute', not what expiry means.
  const text =
    rounded <= 0
      ? durationStyle === 'short'
        ? '0m'
        : '0 minutes'
      : formatDuration(rounded, durationStyle)
  return <span aria-hidden='true'>{text}</span>
}

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

function resolveDisplay(
  display: CountdownDisplay,
  ticking: boolean,
  ms: number
): Exclude<CountdownDisplay, 'auto'> {
  if (display !== 'auto') return display
  if (!ticking) return 'coarse'
  // Past an hour a bare clock hides the days.
  return ms >= HOUR_MS ? 'segments' : 'clock'
}

/**
 * The days / hours / mins / secs breakdown.
 *
 * Every segment animates. NumberFlow only does work when a value changes, so
 * the days field costs one animation a day, not one a second.
 */
function Segments({ ms }: { ms: number }) {
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  // A letter is a suffix, not a word competing with the number: 3d 04h 06m 17s.
  // Decoration only; the live region above still speaks whole words.
  // Minutes and seconds are sexagesimal; days and hours are not.
  const parts: { value: number; label: string; sexagesimal?: boolean }[] = []
  if (days > 0) parts.push({ value: days, label: 'd' })
  if (days > 0 || hours > 0) parts.push({ value: hours, label: 'h' })
  parts.push({ value: minutes, label: 'm', sexagesimal: true })
  parts.push({ value: secs, label: 's', sexagesimal: true })

  // tabular-nums is set once on the root `time`. It inherits, and it crosses
  // into NumberFlow's shadow DOM, so it is not repeated here.
  return (
    <NumberFlowGroup>
      {/* Gaps in em, so spacing keeps its proportion to the digits. The inner
          one is a hair, because the letter is a suffix. */}
      <span
        aria-hidden='true'
        className='inline-flex items-baseline gap-[max(0.5rem,0.56em)]'
      >
        {parts.map((part, i) => (
          <span
            key={part.label}
            className='inline-flex items-baseline gap-[0.08em]'
          >
            <NumberFlow
              value={part.value}
              trend={DESCENDING}
              digits={part.sexagesimal ? SEXAGESIMAL : undefined}
              format={i === 0 ? undefined : { minimumIntegerDigits: 2 }}
              willChange
            />
            {/* Floored so it stays legible inline at small sizes. */}
            <span className='text-[max(0.75rem,0.75em)] text-subtle'>
              {part.label}
            </span>
          </span>
        ))}
      </span>
    </NumberFlowGroup>
  )
}

function isTicking(
  ms: number,
  seconds: CountdownSeconds,
  urgentBelowMs: number
): boolean {
  if (seconds === 'never') return false
  if (seconds === 'always') return true
  return ms <= urgentBelowMs
}

/**
 * Bucketed to what is on screen. In the coarse register the value only moves on
 * a minute boundary, which is what lets React skip the other 59 renders.
 */
/** Test seam. Not exported from the package barrel. */
export function _snapshot(
  target: number,
  seconds: CountdownSeconds,
  urgentBelowMs: number,
  now: number,
  display?: CountdownDisplay
): number {
  return snapshot(target, seconds, urgentBelowMs, now, display)
}

function snapshot(
  target: number,
  seconds: CountdownSeconds,
  urgentBelowMs: number,
  now: number,
  display?: CountdownDisplay
): number {
  // Math.max(0, NaN) is NaN, so an unparseable target has to be caught here
  // rather than relied on to compare its way to zero downstream.
  const remaining = Number.isFinite(target) ? Math.max(0, target - now) : 0
  if (remaining === 0) return 0
  // An explicit coarse display shows words that change once a minute, whatever
  // the seconds setting says, so watching seconds would buy nothing.
  if (display === 'coarse') return Math.ceil(remaining / 60_000) * 60_000
  if (isTicking(remaining, seconds, urgentBelowMs)) {
    return Math.floor(remaining / 1000) * 1000
  }
  return Math.ceil(remaining / 60_000) * 60_000
}

/** Minute-level at most. A per-second live region is unusable. */
function coarseAnnouncement(ms: number): string {
  if (ms >= DAY_MS) {
    const days = Math.ceil(ms / DAY_MS)
    return `${days} ${days === 1 ? 'day' : 'days'} remaining`
  }
  const minutes = Math.ceil(ms / 60_000)
  if (minutes <= 1) return 'Less than a minute remaining'
  if (minutes < 60) return `${minutes} minutes remaining`
  const hours = Math.ceil(minutes / 60)
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} remaining`
}

Countdown.displayName = 'Countdown'
