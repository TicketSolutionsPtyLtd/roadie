import { useCallback, useSyncExternalStore } from 'react'

import { plainDateOf, viewerTimeZone } from '@oztix/roadie-core/datetime'

// Longer than any day, daylight saving included.
const SEARCH_SPAN = 26 * 3_600_000

// Searched rather than counted from midnight, because a daylight saving jump
// can move the date change off midnight or skip midnight altogether.
function msToNextDate(timeZone: string): number {
  const now = Date.now()
  const today = plainDateOf(new Date(now), timeZone)
  let before = now
  let after = now + SEARCH_SPAN
  while (after - before > 1000) {
    const middle = Math.floor((before + after) / 2)
    if (plainDateOf(new Date(middle), timeZone) === today) before = middle
    else after = middle
  }
  // Timers stop while a laptop sleeps, so wake at least hourly to catch up.
  return Math.min(after - now + 50, 3_600_000)
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
          msToNextDate(timeZone ?? viewerTimeZone())
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
