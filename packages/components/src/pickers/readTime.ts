import { formatTimeOfDay, parseDatePhrase } from '@oztix/roadie-core/datetime'

import type { ReadResult } from './readDate'

export type HourCycle = 12 | 24

function wholeStep(minuteStep: number): number {
  return Number.isInteger(minuteStep) && minuteStep >= 1 ? minuteStep : 1
}

const MINUTES_IN_DAY = 24 * 60

function minutesOf(time: string): number {
  const [hour, minute] = time.split(':').map(Number) as [number, number]
  return hour * 60 + minute
}

function timeOf(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

export function formatTime(
  time: string,
  { hourCycle = 12, locale }: { hourCycle?: HourCycle; locale?: string }
): string {
  const minutes = minutesOf(time)
  return (
    formatTimeOfDay(
      new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)),
      {
        timeZone: 'UTC',
        timeStyle: hourCycle === 24 ? 'numeric' : 'medium',
        locale
      }
    ) ?? time
  )
}

/** The time typed text names as 'HH:MM', or why it names none. */
export function readTime(
  text: string,
  {
    hourCycle = 12,
    minuteStep = 1
  }: { hourCycle?: HourCycle; minuteStep?: number } = {}
): ReadResult {
  if (!text.trim()) return { value: null }
  // Only a time is wanted, so no day needs working out.
  const found = parseDatePhrase(text, { now: new Date(0), timeZone: 'UTC' })
    .map(({ value }) =>
      typeof value === 'object' && 'time' in value ? value.time : null
    )
    .find((time): time is string => time !== null)
  if (!found) {
    return {
      error: `Enter a time, like ${hourCycle === 24 ? '19:30' : '7:30pm'}`
    }
  }
  const step = wholeStep(minuteStep)
  if (minutesOf(found) % step !== 0) {
    return { error: `Choose a time in ${step}-minute steps` }
  }
  return { value: found }
}

/** One step later or earlier, on the step grid, past midnight to its far end. */
export function stepTime(
  time: string,
  direction: 1 | -1,
  minuteStep: number
): string {
  const step = wholeStep(minuteStep)
  const minutes = minutesOf(time)
  const onStep =
    direction > 0
      ? Math.floor(minutes / step) * step + step
      : Math.ceil(minutes / step) * step - step
  // Past either end of the day, land on the step grid's last or first time.
  if (onStep >= MINUTES_IN_DAY) return timeOf(0)
  if (onStep < 0) return timeOf(Math.floor((MINUTES_IN_DAY - 1) / step) * step)
  return timeOf(onStep)
}
