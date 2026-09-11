import type { ComponentProps } from 'react'

import {
  type DurationStyle,
  type Durationish,
  formatDuration,
  formatMachineDuration
} from '@oztix/roadie-core/datetime'

export interface DurationProps extends Omit<
  ComponentProps<'time'>,
  'dateTime' | 'children'
> {
  /**
   * The length. A number is milliseconds, a string is an ISO 8601 duration
   * (`PT2H30M`), and the object form is what `Temporal.Duration` exposes.
   *
   * Years and months render nothing, because neither has a fixed length.
   */
  of: Durationish
  /**
   * How much room the surface has. `long` reads '2 hours 30 minutes', `medium`
   * reads '2 hrs 30 mins', `short` reads '2h 30m'. Pick one per view.
   */
  durationStyle?: DurationStyle
}

/**
 * A length of time, rendered as a `time` element.
 *
 * For a measured length: a running time, a support window. Not for time
 * remaining, which is a Countdown, and not for a moment, which is a DateTime.
 *
 * Sets `dateTime` to an ISO 8601 duration, so the markup says how long rather
 * than when.
 */
export function Duration({ of, durationStyle, ...props }: DurationProps) {
  const text = formatDuration(of, durationStyle)
  const machine = formatMachineDuration(of)
  if (text === null) return null

  return (
    <time dateTime={machine ?? undefined} {...props}>
      {text}
    </time>
  )
}

Duration.displayName = 'Duration'
