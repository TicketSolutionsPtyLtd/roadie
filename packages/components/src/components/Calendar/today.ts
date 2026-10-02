import { useCallback, useSyncExternalStore } from 'react'

import { plainDateOf, viewerTimeZone } from '@oztix/roadie-core/datetime'

const HOUR = 3_600_000
const DAY = 24 * HOUR

const clocks = new Map<string, Intl.DateTimeFormat>()

function msToMidnight(timeZone: string): number {
  let clock = clocks.get(timeZone)
  if (!clock) {
    clock = new Intl.DateTimeFormat('en-AU', {
      timeZone,
      hourCycle: 'h23',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    })
    clocks.set(timeZone, clock)
  }
  const now = Date.now()
  const part = (type: string) =>
    Number(clock.formatToParts(now).find((p) => p.type === type)?.value ?? 0)
  const elapsed =
    (part('hour') * 3600 + part('minute') * 60 + part('second')) * 1000 +
    (now % 1000)
  // Woken at least hourly, so a daylight saving change before midnight can
  // only make the wake early, never an hour late.
  return Math.min(DAY - elapsed + 50, HOUR)
}

const noSubscription = () => () => {}

/**
 * Today as a plain date, refreshed at midnight in `timeZone` and when a hidden
 * tab is shown again. Null on the server and while hydrating: cached HTML may
 * be read on a later day, so today's marks appear once the client knows.
 */
export function useToday(
  today: string | undefined,
  timeZone: string | undefined
): string | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      let timer: ReturnType<typeof setTimeout>
      let stopped = false
      const schedule = () => {
        timer = setTimeout(
          () => {
            onChange()
            if (!stopped) schedule()
          },
          msToMidnight(timeZone ?? viewerTimeZone())
        )
      }
      schedule()
      document.addEventListener('visibilitychange', onChange)
      return () => {
        stopped = true
        clearTimeout(timer)
        document.removeEventListener('visibilitychange', onChange)
      }
    },
    [timeZone]
  )
  const zoned = useSyncExternalStore(
    today === undefined ? subscribe : noSubscription,
    () => plainDateOf(new Date(), timeZone ?? viewerTimeZone()),
    () => null
  )
  return today ?? zoned
}
