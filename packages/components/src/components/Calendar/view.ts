import {
  addDays,
  addMonths,
  compareDates,
  startOfWeek
} from '@oztix/roadie-core/datetime'

import {
  between,
  lastDayOf,
  monthOf,
  monthsBetween,
  weekTouches
} from './months'
import type { SwipeStep } from './swipe'

/** Months either side of the opening month a scrolling calendar starts with. */
const SCROLL_BEFORE = 3
const SCROLL_AFTER = 6

export type MonthRun = { start: string; count: number }

export type ViewModelOptions = {
  scrolling: boolean
  weekView: boolean
  /** As asked for, before the bounds and the layout have their say. */
  numberOfMonths: number
  startMonth?: string
  endMonth?: string
  weekStart: number
  /** The month to open on, or null while it waits for today. */
  shownMonth: string | null
  /** The months a scrolling calendar has grown to. */
  run: MonthRun | null
  /** The week the reader last turned to. */
  navigatedWeek: string | null
  focusedDate: string | null
  /** The chosen days, the first of them first. */
  chosen: readonly string[]
  today: string | null
  /** `disabled` is `true`, which stops every turn. */
  disabled: boolean
}

/** What months and days show, and where a turn or a key press moves to. */
export function viewModel(options: ViewModelOptions) {
  const { scrolling, weekView, startMonth, endMonth, weekStart } = options
  const { run, navigatedWeek, focusedDate, chosen, today } = options
  const boundedSpan =
    startMonth && endMonth ? monthsBetween(startMonth, endMonth) + 1 : Infinity
  const numberOfMonths =
    scrolling || weekView
      ? 1
      : Math.max(1, Math.min(Math.floor(options.numberOfMonths), boundedSpan))
  const firstAllowedMonth = startMonth ? monthOf(startMonth) : null
  const lastAllowedMonth = endMonth
    ? addMonths(monthOf(endMonth), 1 - numberOfMonths)
    : null
  const minDate = firstAllowedMonth
  const maxDate = endMonth ? lastDayOf(monthOf(endMonth)) : null
  const clampMonth = (month: string) => {
    if (lastAllowedMonth && compareDates(month, lastAllowedMonth) > 0)
      month = lastAllowedMonth
    if (firstAllowedMonth && compareDates(month, firstAllowedMonth) < 0)
      month = firstAllowedMonth
    return month
  }
  const clampDate = (date: string) => {
    if (minDate && compareDates(date, minDate) < 0) return minDate
    if (maxDate && compareDates(date, maxDate) > 0) return maxDate
    return date
  }
  const firstMonth = clampMonth(options.shownMonth ?? '2000-01-01')

  // A scrolling calendar shows a run of months around the first one, which
  // grows at either end as it is scrolled or the keyboard leaves it.
  const runAround = (month: string) => {
    const start = clampMonth(addMonths(month, -SCROLL_BEFORE))
    const last = clampMonth(addMonths(month, SCROLL_AFTER))
    return { start, count: monthsBetween(start, last) + 1 }
  }
  // A first month already in the run, such as one scrolled to, keeps it.
  const currentRun =
    run &&
    compareDates(firstMonth, run.start) >= 0 &&
    compareDates(firstMonth, addMonths(run.start, run.count - 1)) <= 0
      ? run
      : runAround(firstMonth)
  const months = scrolling
    ? Array.from({ length: currentRun.count }, (_, i) =>
        addMonths(currentRun.start, i)
      )
    : Array.from({ length: numberOfMonths }, (_, i) => addMonths(firstMonth, i))
  const lastMonth = months[months.length - 1]!

  const firstChosen = chosen[0] ?? null
  // Kept while it touches the month shown, so switching views or a parent's
  // `month` lands somewhere sensible.
  const shownWeek =
    navigatedWeek && weekTouches(navigatedWeek, firstMonth)
      ? navigatedWeek
      : startOfWeek(
          [focusedDate, firstChosen, today].find(
            (date): date is string => !!date && monthOf(date) === firstMonth
          ) ?? firstMonth,
          weekStart
        )
  const visibleStart = weekView ? shownWeek : months[0]!
  const lastVisibleDay = weekView ? addDays(shownWeek, 6) : lastDayOf(lastMonth)
  const isVisible = (date: string) =>
    between(date, visibleStart, lastVisibleDay)
  const focusTarget =
    [focusedDate, firstChosen, today].find(
      (date): date is string => !!date && isVisible(date)
    ) ?? visibleStart

  const canTurn = (step: SwipeStep) => {
    if (options.disabled) return false
    if (weekView) {
      const edge = addDays(shownWeek, step === 1 ? 7 : -1)
      return step === 1
        ? !maxDate || compareDates(edge, maxDate) <= 0
        : !minDate || compareDates(edge, minDate) >= 0
    }
    const limit = step === 1 ? lastAllowedMonth : firstAllowedMonth
    return !limit || compareDates(firstMonth, limit) * step < 0
  }

  /** The page a turn shows: a week and the month it starts or ends in, or a month. */
  const turnTo = (step: SwipeStep) => {
    if (!weekView) return { week: null, month: addMonths(firstMonth, step) }
    const week = addDays(shownWeek, step * 7)
    return { week, month: monthOf(step === 1 ? week : addDays(week, 6)) }
  }

  /** The run a scrolling calendar grows to, to reach a month. */
  const extendedRun = (to: string): MonthRun => {
    const month = monthOf(to)
    const start =
      compareDates(month, currentRun.start) < 0 ? month : currentRun.start
    const end = compareDates(month, lastMonth) > 0 ? month : lastMonth
    return { start, count: monthsBetween(start, end) + 1 }
  }

  /** What has to change for a day to show: the run, the week, or the month. */
  const reveal = (
    date: string
  ): { run?: MonthRun; week?: string; month?: string } => {
    if (scrolling) return isVisible(date) ? {} : { run: extendedRun(date) }
    if (weekView)
      return isVisible(date)
        ? {}
        : { week: startOfWeek(date, weekStart), month: monthOf(date) }
    if (compareDates(date, firstMonth) < 0)
      return { month: clampMonth(monthOf(date)) }
    if (compareDates(date, lastVisibleDay) > 0)
      return { month: clampMonth(addMonths(monthOf(date), 1 - numberOfMonths)) }
    return {}
  }

  // The month a week opens on: a chosen day's in it, then the focused day's,
  // then the month holding most of it, which its fourth day is always in.
  const monthOfWeek = (start: string) => {
    const end = addDays(start, 6)
    const day = [...chosen, focusedDate].find(
      (date): date is string => !!date && between(date, start, end)
    )
    return monthOf(day ?? addDays(start, 3))
  }

  return {
    numberOfMonths,
    firstAllowedMonth,
    lastAllowedMonth,
    minDate,
    maxDate,
    clampMonth,
    clampDate,
    firstMonth,
    currentRun,
    months,
    shownWeek,
    visibleStart,
    lastVisibleDay,
    isVisible,
    focusTarget,
    canTurn,
    turnTo,
    extendedRun,
    reveal,
    monthOfWeek
  }
}
