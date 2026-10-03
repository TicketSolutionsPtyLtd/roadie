'use client'

import {
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon
} from '@phosphor-icons/react'
import { cva } from 'class-variance-authority'

import {
  addDays,
  addMonths,
  compareDates,
  monthGrid
} from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { IconButton } from '../Button/IconButton'
import { surfaceClass, useSurface } from '../Records/surface'
import { dateForKey } from './keys'
import {
  dayLabel,
  monthLabel,
  monthNames,
  rangeLabel,
  weekdayNames
} from './labels'
import {
  type CalendarMatchers,
  matchesDate,
  modifierAttribute
} from './matchers'
import {
  type CalendarDateRange,
  type CalendarMode,
  type CalendarSelection,
  isSelected,
  previewRange,
  selectDate,
  withinLength
} from './selection'
import { useToday } from './today'

type CalendarBaseProps = Omit<
  ComponentProps<'div'>,
  'onSelect' | 'defaultValue' | 'children'
> & {
  /**
   * Days that can be focused but not chosen. `true` disables every day and
   * the month navigation.
   */
  disabled?: boolean | CalendarMatchers
  /**
   * Named sets of days. Each name becomes a data attribute on its days, so
   * `hasSession` renders `data-has-session` for styling.
   */
  modifiers?: Record<string, CalendarMatchers>
  /**
   * Months shown at once, side by side where they fit and stacked where
   * they don't.
   *
   * @default 1
   */
  numberOfMonths?: number
  /**
   * `paged` turns the months with arrows. `scroll` stacks them in a list
   * that scrolls, under one pinned row of weekdays, adding months as it
   * nears either end. It opens on `month`, the selection or today.
   *
   * @default 'paged'
   */
  layout?: 'paged' | 'scroll'
  /**
   * `dropdown` swaps the month name for month and year selects. Paged only.
   *
   * @default 'label'
   */
  captionLayout?: 'label' | 'dropdown'
  /** Always show six weeks, so the calendar keeps its height. */
  fixedWeeks?: boolean
  /** Show the days of the months either side that fill the first and last weeks. */
  showOutsideDays?: boolean
  /**
   * First day of the week: 1 is Monday and 7 is Sunday.
   *
   * @default 1
   */
  weekStart?: number
  /** The first month shown, as any ISO date in it. Pair with `onMonthChange`. */
  month?: string
  /** The month shown first when uncontrolled. Defaults to the selection, then today. */
  defaultMonth?: string
  /** Called with the first of the month when the shown month changes. */
  onMonthChange?: (month: string) => void
  /** The earliest month navigation reaches, as any ISO date in it. */
  startMonth?: string
  /** The latest month navigation reaches, as any ISO date in it. */
  endMonth?: string
  /** Today as an ISO date. Defaults to today in `timeZone`. */
  today?: string
  /**
   * IANA zone used only to work out today. Defaults to the viewer's zone.
   */
  timeZone?: string
  /** @default 'en-AU' */
  locale?: string
  /** Focus the day holding the tab stop when the calendar mounts. */
  autoFocus?: boolean
}

export type CalendarSingleProps = CalendarBaseProps & {
  /** @default 'single' */
  mode?: 'single'
  /**
   * The chosen day, as an ISO date. In `multiple` mode a list of dates, and in
   * `range` mode `{ start, end }`, with `end` null until the second press.
   * Pair with `onSelect`.
   */
  selected?: string | null
  /** The selection to start from when uncontrolled. */
  defaultSelected?: string | null
  /** Called with the new selection, in the shape `selected` takes. */
  onSelect?: (selected: string | null) => void
  /** Keep the day, or the last of several days, chosen when it is pressed again. */
  required?: boolean
}

export type CalendarMultipleProps = CalendarBaseProps & {
  mode: 'multiple'
  selected?: readonly string[]
  defaultSelected?: readonly string[]
  onSelect?: (selected: string[]) => void
  required?: boolean
}

export type CalendarRangeProps = CalendarBaseProps & {
  mode: 'range'
  selected?: CalendarDateRange
  defaultSelected?: CalendarDateRange
  onSelect?: (selected: CalendarDateRange) => void
  /** The fewest days a range can span, both ends counted. */
  min?: number
  /** The most days a range can span, both ends counted. */
  max?: number
}

export type CalendarProps =
  CalendarSingleProps | CalendarMultipleProps | CalendarRangeProps

type AnyCalendarProps = CalendarBaseProps & {
  mode?: CalendarMode
  selected?: CalendarSelection
  defaultSelected?: CalendarSelection
  onSelect?(selected: CalendarSelection): void
  required?: boolean
  min?: number
  max?: number
}

const emptyRange = (): CalendarDateRange => ({ start: null, end: null })

// The column fills its share of the month; the day stays a circle no wider
// than 48px, centred in it.
const dayVariants = cva(
  'relative mx-auto grid aspect-square w-full max-w-12 place-content-center rounded-full border text-sm tabular-nums is-interactive',
  {
    variants: {
      look: {
        plain: 'emphasis-subtler border-transparent',
        // Forced colours drop the fills, so a Highlight edge carries the state.
        chosen:
          'intent-accent emphasis-strong font-semibold forced-colors:border-[Highlight]',
        // The band is the cell's, so it runs edge to edge past the circle.
        middle:
          'intent-accent emphasis-subtler border-transparent forced-colors:border-[Highlight]'
      },
      outside: { true: '', false: '' }
    },
    compoundVariants: [{ look: 'plain', outside: true, class: 'text-subtle' }]
  }
)

function monthOf(date: string): string {
  return `${date.slice(0, 7)}-01`
}

function lastDayOf(month: string): string {
  return addDays(addMonths(month, 1), -1)
}

function yearOf(date: string): number {
  return Number(date.slice(0, 4))
}

function monthNumberOf(date: string): number {
  return Number(date.slice(5, 7))
}

function between(date: string, start: string, end: string) {
  return compareDates(date, start) >= 0 && compareDates(date, end) <= 0
}

/** Months either side of the opening month a scrolling calendar starts with. */
const SCROLL_BEFORE = 2
const SCROLL_AFTER = 6
/** Months a scrolling calendar adds as it nears an end. */
const SCROLL_STEP = 6

function monthsBetween(from: string, to: string): number {
  return (
    (yearOf(to) - yearOf(from)) * 12 + monthNumberOf(to) - monthNumberOf(from)
  )
}

function scrollingAncestor(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(el).overflowY)) return el
  }
  return null
}

function firstSelectedOf(mode: CalendarMode, selection: CalendarSelection) {
  if (mode === 'single') return selection as string | null
  if (mode === 'multiple') return (selection as readonly string[])[0] ?? null
  return (selection as CalendarDateRange).start
}

export function Calendar(props: CalendarProps) {
  const {
    mode = 'single',
    selected: selectedProp,
    defaultSelected,
    onSelect,
    required,
    min,
    max,
    disabled,
    modifiers,
    numberOfMonths: numberOfMonthsProp = 1,
    layout = 'paged',
    captionLayout: captionLayoutProp = 'label',
    fixedWeeks = false,
    showOutsideDays = false,
    weekStart = 1,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    startMonth,
    endMonth,
    today: todayProp,
    timeZone,
    locale: localeProp = 'en-AU',
    autoFocus = false,
    className,
    ref,
    ...rest
  } = props as AnyCalendarProps

  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const weekdaysRef = useRef<HTMLDivElement>(null)
  useSurface(weekdaysRef, layout)
  const scrolling = layout === 'scroll'
  const captionLayout = scrolling ? 'label' : captionLayoutProp
  const boundedSpan =
    startMonth && endMonth
      ? (yearOf(endMonth) - yearOf(startMonth)) * 12 +
        monthNumberOf(endMonth) -
        monthNumberOf(startMonth) +
        1
      : Infinity
  const numberOfMonths = scrolling
    ? 1
    : Math.max(1, Math.min(Math.floor(numberOfMonthsProp), boundedSpan))
  const today = useToday(todayProp, timeZone)
  // The grid is Gregorian, so its labels must be too, whatever the locale prefers.
  const locale = new Intl.Locale(localeProp, { calendar: 'gregory' }).toString()

  const emptySelection =
    mode === 'multiple' ? [] : mode === 'range' ? emptyRange() : null
  const [uncontrolled, setUncontrolled] = useState(() => ({
    mode,
    selection: defaultSelected ?? emptySelection
  }))
  const selection =
    selectedProp !== undefined
      ? selectedProp
      : uncontrolled.mode === mode
        ? uncontrolled.selection
        : emptySelection

  const firstAllowedMonth = startMonth ? monthOf(startMonth) : null
  const lastAllowedMonth = endMonth
    ? addMonths(monthOf(endMonth), 1 - numberOfMonths)
    : null
  const clampMonth = (month: string) => {
    if (lastAllowedMonth && compareDates(month, lastAllowedMonth) > 0)
      month = lastAllowedMonth
    if (firstAllowedMonth && compareDates(month, firstAllowedMonth) < 0)
      month = firstAllowedMonth
    return month
  }

  const [initialAnchor] = useState(
    () => defaultMonth ?? firstSelectedOf(mode, selection)
  )
  // Null until the reader turns the page, so the opening month follows today
  // once hydration swaps the server's UTC date for the viewer's.
  const [navigatedMonth, setNavigatedMonth] = useState<string | null>(null)
  const anchor = initialAnchor ?? today
  const shownMonth = monthProp
    ? monthOf(monthProp)
    : (navigatedMonth ?? (anchor ? monthOf(anchor) : null))
  // With nothing to place it, the month waits for the client to know today.
  const waitingForToday = shownMonth === null
  const firstMonth = clampMonth(shownMonth ?? '2000-01-01')

  // A scrolling calendar shows a run of months around the first one, which
  // grows at either end as it is scrolled or the keyboard leaves it.
  const [run, setRun] = useState<{
    around: string
    start: string
    count: number
  } | null>(null)
  const runAround = (month: string) => {
    const start = clampMonth(addMonths(month, -SCROLL_BEFORE))
    const last = clampMonth(addMonths(month, SCROLL_AFTER))
    return { around: month, start, count: monthsBetween(start, last) + 1 }
  }
  const currentRun =
    run && run.around === firstMonth ? run : runAround(firstMonth)
  const months = scrolling
    ? Array.from({ length: currentRun.count }, (_, i) =>
        addMonths(currentRun.start, i)
      )
    : Array.from({ length: numberOfMonths }, (_, i) => addMonths(firstMonth, i))
  const visibleStart = months[0]!
  const lastVisibleDay = lastDayOf(months[months.length - 1]!)
  const isVisible = (date: string) =>
    between(date, visibleStart, lastVisibleDay)

  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const [hasFocus, setHasFocus] = useState(false)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [pendingFocus, setPendingFocus] = useState<{ date: string } | null>(
    null
  )
  const servedFocus = useRef<{ date: string } | null>(null)
  const autoFocused = useRef(false)

  const focusTarget =
    [focusedDate, firstSelectedOf(mode, selection), today].find(
      (date): date is string => !!date && isVisible(date)
    ) ?? firstMonth

  const labels = useMemo(
    () => ({
      weekdays: weekdayNames(weekStart, locale),
      months: monthNames(locale)
    }),
    [weekStart, locale]
  )

  const range = mode === 'range' ? (selection as CalendarDateRange) : null
  const extending = !!range?.start && !range.end
  const isOutOfRange = (date: string) =>
    extending &&
    date !== range!.start &&
    !withinLength(range!.start!, date, { min, max })
  const previewTarget = hoverDate ?? (hasFocus ? focusTarget : null)
  const preview =
    range && previewTarget && !isOutOfRange(previewTarget)
      ? previewRange(range, previewTarget)
      : null
  const span =
    range?.start && range.end
      ? { start: range.start, end: range.end }
      : (preview ??
        (extending ? { start: range!.start!, end: range!.start! } : null))

  const minDate = firstAllowedMonth
  const maxDate = endMonth ? lastDayOf(monthOf(endMonth)) : null
  const disabledMatchers = typeof disabled === 'boolean' ? undefined : disabled

  const isDayDisabled = (date: string) =>
    disabled === true ||
    (minDate !== null && compareDates(date, minDate) < 0) ||
    (maxDate !== null && compareDates(date, maxDate) > 0) ||
    matchesDate(date, disabledMatchers)

  const monthsLabel = (month: string) =>
    numberOfMonths === 1
      ? monthLabel(month, locale)
      : `${monthLabel(month, locale)} to ${monthLabel(addMonths(month, numberOfMonths - 1), locale)}`

  function changeMonth(next: string) {
    const month = clampMonth(monthOf(next))
    if (month === firstMonth) return
    if (monthProp === undefined) setNavigatedMonth(month)
    onMonthChange?.(month)
  }

  function turnMonth(next: string) {
    setPendingFocus(null)
    changeMonth(next)
  }

  function commit(next: CalendarSelection) {
    if (selectedProp === undefined) setUncontrolled({ mode, selection: next })
    onSelect?.(next)
  }

  function describeSelection(
    previous: CalendarSelection,
    next: CalendarSelection
  ) {
    if (mode === 'multiple') {
      const before = previous as readonly string[]
      const after = next as readonly string[]
      const added = after.filter((date) => !before.includes(date))
      const removed = before.filter((date) => !after.includes(date))
      if (!added.length && !removed.length) return null
      if (!after.length) return 'Selection cleared'
      if (added.length + removed.length !== 1)
        return `${after.length} dates selected`
      return added[0]
        ? `Selected ${dayLabel(added[0], locale)}`
        : `Deselected ${dayLabel(removed[0]!, locale)}`
    }
    if (mode === 'single') {
      return next
        ? `Selected ${dayLabel(next as string, locale)}`
        : 'Selection cleared'
    }
    const { start, end } = next as CalendarDateRange
    if (!start) return 'Selection cleared'
    if (!end) return `Range starts ${dayLabel(start, locale)}`
    return start === end
      ? `Selected ${dayLabel(start, locale)}`
      : `Selected ${rangeLabel(start, end, locale)}`
  }

  // Announced from what renders, not what was asked for, so a controlled
  // parent that keeps, defers or makes a change is heard as it really is.
  const selectionKey = JSON.stringify(selection)
  const shownMonthKey = waitingForToday ? null : firstMonth
  // Null while the month follows today, so a midnight rollover isn't spoken.
  const chosenMonth = monthProp ?? navigatedMonth
  const [heard, setHeard] = useState({
    mode,
    selectionKey,
    selection,
    month: shownMonthKey
  })
  if (
    heard.mode !== mode ||
    heard.selectionKey !== selectionKey ||
    heard.month !== shownMonthKey
  ) {
    const messages = []
    if (
      chosenMonth &&
      heard.month &&
      shownMonthKey &&
      heard.month !== shownMonthKey
    )
      messages.push(monthsLabel(shownMonthKey))
    const selectionMessage =
      heard.mode === mode &&
      heard.selectionKey !== selectionKey &&
      describeSelection(heard.selection, selection)
    if (selectionMessage) messages.push(selectionMessage)
    setHeard({ mode, selectionKey, selection, month: shownMonthKey })
    if (messages.length) setAnnouncement(messages.join('. '))
  }

  function select(date: string) {
    if (isDayDisabled(date)) return
    const next = selectDate(mode, selection, date, { required, min, max })
    if (next === selection) return
    commit(next)
  }

  // The day's own onFocus records it, so the tab stop never moves to a day
  // that a controlled parent hasn't shown yet.
  function extendRun(to: string) {
    const month = monthOf(to)
    const start =
      compareDates(month, currentRun.start) < 0 ? month : currentRun.start
    const last = months[months.length - 1]!
    const end = compareDates(month, last) > 0 ? month : last
    setRun({
      around: firstMonth,
      start,
      count: monthsBetween(start, end) + 1
    })
  }

  function moveFocus(date: string) {
    setHoverDate(null)
    setPendingFocus({ date })
    if (scrolling) {
      if (!isVisible(date)) extendRun(date)
      return
    }
    if (compareDates(date, firstMonth) < 0) changeMonth(date)
    else if (compareDates(date, lastVisibleDay) > 0)
      changeMonth(addMonths(monthOf(date), 1 - numberOfMonths))
  }

  function clampDate(date: string) {
    if (minDate && compareDates(date, minDate) < 0) return minDate
    if (maxDate && compareDates(date, maxDate) > 0) return maxDate
    return date
  }

  function onDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    if (event.key === 'Escape' && extending && disabled !== true) {
      event.preventDefault()
      event.stopPropagation()
      commit(emptyRange())
      return
    }
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    const next = dateForKey(event.key, date, {
      shiftKey: event.shiftKey,
      weekStart,
      rtl
    })
    if (!next) return
    event.preventDefault()
    if (disabled === true && !isVisible(next)) return
    moveFocus(clampDate(next))
  }

  const findDay = (date: string) =>
    rootRef.current?.querySelector<HTMLButtonElement>(
      `button[data-date="${date}"]:not([data-outside])`
    )
  const focusDay = (date: string) => findDay(date)?.focus()

  // A key's target may render later, when a controlled parent moves `month`.
  useEffect(() => {
    if (!pendingFocus || servedFocus.current === pendingFocus) return
    const button = findDay(pendingFocus.date)
    if (!button) return
    servedFocus.current = pendingFocus
    button.focus()
  }, [pendingFocus, firstMonth, visibleStart, lastVisibleDay])

  const todayKnown = today !== null
  useEffect(() => {
    if (!autoFocus || autoFocused.current || !todayKnown) return
    autoFocused.current = true
    focusDay(focusTarget)
    // Once, as on an input, but only after hydration knows today.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKnown])

  // Brings the first month to the top of the list, under the weekdays, when
  // it opens and whenever the first month changes.
  const scrolledTo = useRef<string | null>(null)
  useIsomorphicLayoutEffect(() => {
    if (!scrolling || waitingForToday || scrolledTo.current === firstMonth)
      return
    const root = rootRef.current
    const month = root?.querySelector(`[data-month="${firstMonth}"]`)
    const scroller = root && scrollingAncestor(root)
    if (!month || !scroller) return
    scrolledTo.current = firstMonth
    const weekdays = weekdaysRef.current?.getBoundingClientRect()
    const stuckAt =
      scroller.getBoundingClientRect().top +
      (weekdays ? weekdays.height : 0) +
      (parseFloat(getComputedStyle(weekdaysRef.current!).top) || 0)
    scroller.scrollBy({
      top: month.getBoundingClientRect().top - stuckAt,
      behavior: 'instant'
    })
  })

  // Months added above would push what is in view down; the scroll moves
  // with them. Engines that anchor scrolling themselves leave nothing to do.
  const keptInView = useRef<{ month: string; top: number } | null>(null)
  useIsomorphicLayoutEffect(() => {
    const kept = keptInView.current
    if (!kept) return
    keptInView.current = null
    const root = rootRef.current
    const month = root?.querySelector(`[data-month="${kept.month}"]`)
    const scroller = root && scrollingAncestor(root)
    if (!month || !scroller) return
    scroller.scrollBy({
      top: month.getBoundingClientRect().top - kept.top,
      behavior: 'instant'
    })
  })

  const earlierRef = useRef<HTMLDivElement>(null)
  const laterRef = useRef<HTMLDivElement>(null)
  const canAddEarlier =
    !firstAllowedMonth || compareDates(visibleStart, firstAllowedMonth) > 0
  const canAddLater =
    !lastAllowedMonth ||
    compareDates(months[months.length - 1]!, lastAllowedMonth) < 0
  const growRun = (earlier: boolean) => {
    if (earlier) {
      const month = rootRef.current?.querySelector(
        `[data-month="${visibleStart}"]`
      )
      if (month)
        keptInView.current = {
          month: visibleStart,
          top: month.getBoundingClientRect().top
        }
      extendRun(clampMonth(addMonths(visibleStart, -SCROLL_STEP)))
    } else {
      extendRun(clampMonth(addMonths(months[months.length - 1]!, SCROLL_STEP)))
    }
  }
  const growRunRef = useRef(growRun)
  useIsomorphicLayoutEffect(() => {
    growRunRef.current = growRun
  })
  useEffect(() => {
    if (!scrolling || waitingForToday) return
    if (typeof IntersectionObserver === 'undefined') return
    const root = rootRef.current && scrollingAncestor(rootRef.current)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          growRunRef.current(entry.target === earlierRef.current)
        }
      },
      { root, rootMargin: '400px 0px' }
    )
    if (canAddEarlier && earlierRef.current)
      observer.observe(earlierRef.current)
    if (canAddLater && laterRef.current) observer.observe(laterRef.current)
    return () => observer.disconnect()
  }, [
    scrolling,
    waitingForToday,
    canAddEarlier,
    canAddLater,
    visibleStart,
    months.length
  ])

  const navDisabled = disabled === true
  const todayYear = yearOf(today ?? firstMonth)
  const firstYear = startMonth
    ? yearOf(startMonth)
    : Math.min(yearOf(firstMonth), todayYear) - 100
  const lastYear = endMonth
    ? yearOf(endMonth)
    : Math.max(yearOf(firstMonth), todayYear) + 10

  function renderCaption(month: string, index: number) {
    const captionId = `${id}-caption-${index}`
    const label = monthLabel(month, locale)
    if (captionLayout === 'label') {
      return (
        <div
          id={captionId}
          className={cn(
            'text-sm font-semibold text-strong',
            scrolling ? 'text-start' : 'text-center'
          )}
        >
          {label}
        </div>
      )
    }
    const shift = (next: string) => turnMonth(addMonths(next, -index))
    const monthNumber = monthNumberOf(month)
    const year = yearOf(month)
    // The page turn clamps to the nearest allowed month, so a year is open
    // when any of its months can sit in this caption.
    const yearHoldsAllowedMonth = (candidateYear: number) =>
      (!firstAllowedMonth ||
        candidateYear >= yearOf(addMonths(firstAllowedMonth, index))) &&
      (!lastAllowedMonth ||
        candidateYear <= yearOf(addMonths(lastAllowedMonth, index)))
    const outOfBounds = (candidate: string) => {
      const first = addMonths(candidate, -index)
      return (
        (!!firstAllowedMonth && compareDates(first, firstAllowedMonth) < 0) ||
        (!!lastAllowedMonth && compareDates(first, lastAllowedMonth) > 0)
      )
    }
    return (
      <div className='flex justify-center gap-1'>
        <span id={captionId} className='sr-only'>
          {label}
        </span>
        <CaptionSelect
          aria-label='Month'
          value={monthNumber}
          disabled={navDisabled}
          onChange={(value) => shift(addMonths(month, value - monthNumber))}
          options={labels.months.map((name, i) => ({
            value: i + 1,
            label: name,
            disabled: outOfBounds(addMonths(month, i + 1 - monthNumber))
          }))}
        />
        <CaptionSelect
          aria-label='Year'
          value={year}
          disabled={navDisabled}
          onChange={(value) => shift(addMonths(month, (value - year) * 12))}
          options={Array.from({ length: lastYear - firstYear + 1 }, (_, i) => ({
            value: firstYear + i,
            label: String(firstYear + i),
            disabled: !yearHoldsAllowedMonth(firstYear + i)
          }))}
        />
      </div>
    )
  }

  function renderDay(date: string, month: string, column: number) {
    const outside = monthOf(date) !== month
    if (outside && !showOutsideDays) {
      return <td key={date} role='gridcell' className='p-0' />
    }
    const selected = isSelected(mode, selection, date)
    const inSpan = !!span && between(date, span.start, span.end)
    const rangeStart = inSpan && date === span!.start
    const rangeEnd = inSpan && date === span!.end
    const rangeMiddle = inSpan && !rangeStart && !rangeEnd
    const previewing = !!preview && inSpan
    const isDisabled = isDayDisabled(date)
    const outOfRange = isOutOfRange(date)
    const isToday = date === today
    const isFocusTarget = !outside && date === focusTarget
    const multiDay = !!span && span.start !== span.end
    const firstVisible = column === 0 || (!showOutsideDays && date === month)
    const lastVisible =
      column === 6 || (!showOutsideDays && date === lastDayOf(month))
    const look =
      rangeStart || rangeEnd || (mode !== 'range' && selected)
        ? 'chosen'
        : rangeMiddle
          ? 'middle'
          : 'plain'

    const modifierAttributes = Object.fromEntries(
      Object.entries(modifiers ?? {})
        .filter(([, matchers]) => matchesDate(date, matchers))
        .map(([name]) => [modifierAttribute(name), ''])
    )

    return (
      <td
        key={date}
        role='gridcell'
        aria-selected={selected}
        className={cn(
          'relative p-0',
          rangeMiddle && 'bg-subtle intent-accent',
          rangeMiddle && firstVisible && 'rounded-s-full',
          rangeMiddle && lastVisible && 'rounded-e-full',
          multiDay &&
            ((rangeStart && !lastVisible) || (rangeEnd && !firstVisible)) &&
            "intent-accent before:absolute before:inset-y-0 before:w-1/2 before:bg-subtle before:content-['']",
          rangeStart && 'before:end-0',
          rangeEnd && 'before:start-0'
        )}
      >
        <button
          type='button'
          {...modifierAttributes}
          data-date={date}
          data-selected={selected ? '' : undefined}
          data-range-start={rangeStart ? '' : undefined}
          data-range-middle={rangeMiddle ? '' : undefined}
          data-range-end={rangeEnd ? '' : undefined}
          data-range-preview={previewing ? '' : undefined}
          data-today={isToday ? '' : undefined}
          data-outside={outside ? '' : undefined}
          data-disabled={isDisabled ? '' : undefined}
          data-out-of-range={outOfRange ? '' : undefined}
          data-focused={hasFocus && isFocusTarget ? '' : undefined}
          aria-label={[
            isToday && 'Today',
            dayLabel(date, locale),
            selected && 'selected'
          ]
            .filter(Boolean)
            .join(', ')}
          aria-disabled={isDisabled || undefined}
          aria-current={isToday ? 'date' : undefined}
          tabIndex={isFocusTarget ? 0 : -1}
          className={cn(
            dayVariants({ look, outside }),
            outOfRange && 'opacity-50'
          )}
          onClick={() => {
            if (isDisabled) return
            select(date)
            if (outside) moveFocus(date)
          }}
          onFocus={() => {
            setHasFocus(true)
            if (!outside) setFocusedDate(date)
          }}
          onBlur={() => setHasFocus(false)}
          onKeyDown={(event) => onDayKeyDown(event, date)}
          onPointerEnter={(event: PointerEvent) => {
            if (event.pointerType !== 'touch') setHoverDate(date)
          }}
        >
          {Number(date.slice(8))}
          {isToday && (
            <span
              aria-hidden='true'
              className='absolute inset-x-0 bottom-1 mx-auto size-1 rounded-full bg-current'
            />
          )}
        </button>
      </td>
    )
  }

  const weekdayCells = labels.weekdays.map((weekday) => (
    <span key={weekday.long}>{weekday.short}</span>
  ))

  return (
    <div
      ref={mergeRefs(rootRef, ref)}
      data-slot='calendar'
      data-layout={layout}
      className={cn(
        'relative w-full',
        scrolling ? 'grid gap-6' : 'flex flex-wrap gap-x-6 gap-y-4',
        className
      )}
      {...rest}
      onFocus={(event) => {
        rest.onFocus?.(event)
        if ((event.target as HTMLElement).dataset.date !== pendingFocus?.date)
          setPendingFocus(null)
      }}
      onBlur={(event) => {
        rest.onBlur?.(event)
        if (!event.currentTarget.contains(event.relatedTarget))
          setPendingFocus(null)
      }}
    >
      <div role='status' className='sr-only'>
        {announcement}
      </div>
      {scrolling && (
        <div
          ref={weekdaysRef}
          aria-hidden='true'
          data-slot='calendar-weekdays'
          className={cn(
            'sticky top-0 z-1 grid h-8 grid-cols-7 items-center text-center text-xs font-medium text-subtle',
            surfaceClass
          )}
        >
          {weekdayCells}
        </div>
      )}
      {scrolling && canAddEarlier && (
        <div
          ref={earlierRef}
          aria-hidden='true'
          className='pointer-events-none absolute inset-x-0 top-0 h-px'
        />
      )}
      {waitingForToday &&
        months.slice(0, scrolling ? 1 : undefined).map((month) => (
          <div
            key={month}
            aria-hidden='true'
            className='@container min-w-70 flex-[1_1_--spacing(70)]'
          >
            {/* Six weeks of days as wide as the month allows, with its caption and weekdays. */}
            <div className='h-[calc(min(100cqi/7,--spacing(12))*6+--spacing(22))]' />
          </div>
        ))}
      {!waitingForToday &&
        months.map((month, index) => (
          <div
            // By position, so the arrows and selects keep focus as months turn.
            key={scrolling ? month : index}
            data-slot='calendar-month'
            data-month={month}
            // Contained, so a month asks for 280px and takes whatever more it is given.
            className='grid min-w-70 flex-[1_1_--spacing(70)] content-start gap-2 [contain:inline-size]'
          >
            {scrolling ? (
              <div className='grid h-8 items-center'>
                {renderCaption(month, index)}
              </div>
            ) : (
              <div className='grid h-8 grid-cols-[2rem_1fr_2rem] items-center gap-1'>
                {index === 0 ? (
                  <IconButton
                    emphasis='subtler'
                    size='sm'
                    aria-label='Previous month'
                    disabled={
                      navDisabled ||
                      (!!firstAllowedMonth &&
                        compareDates(firstMonth, firstAllowedMonth) <= 0)
                    }
                    onClick={() => turnMonth(addMonths(firstMonth, -1))}
                  >
                    <CaretLeftIcon
                      weight='bold'
                      className='size-4 rtl:-scale-x-100'
                    />
                  </IconButton>
                ) : (
                  <span />
                )}
                {renderCaption(month, index)}
                {index === numberOfMonths - 1 ? (
                  <IconButton
                    emphasis='subtler'
                    size='sm'
                    aria-label='Next month'
                    disabled={
                      navDisabled ||
                      (!!lastAllowedMonth &&
                        compareDates(firstMonth, lastAllowedMonth) >= 0)
                    }
                    onClick={() => turnMonth(addMonths(firstMonth, 1))}
                  >
                    <CaretRightIcon
                      weight='bold'
                      className='size-4 rtl:-scale-x-100'
                    />
                  </IconButton>
                ) : (
                  <span />
                )}
              </div>
            )}
            <table
              role='grid'
              aria-multiselectable={mode !== 'single' || undefined}
              aria-labelledby={`${id}-caption-${index}`}
              className='w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-0.5'
              onPointerLeave={() => setHoverDate(null)}
            >
              {/* A scrolling list shows its weekdays once, pinned above it. */}
              <thead className={scrolling ? 'sr-only' : undefined}>
                <tr role='row'>
                  {labels.weekdays.map((weekday) => (
                    <th
                      key={weekday.long}
                      role='columnheader'
                      scope='col'
                      aria-label={weekday.long}
                      className='h-8 p-0 text-xs font-medium text-subtle'
                    >
                      {weekday.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthGrid(yearOf(month), monthNumberOf(month), {
                  weekStart,
                  fixedWeeks
                }).map((week) => (
                  <tr key={week[0]} role='row'>
                    {week.map((date, column) => renderDay(date, month, column))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {scrolling && canAddLater && (
        <div
          ref={laterRef}
          aria-hidden='true'
          className='pointer-events-none absolute inset-x-0 bottom-0 h-px'
        />
      )}
    </div>
  )
}

Calendar.displayName = 'Calendar'

type CaptionSelectProps = {
  'aria-label': string
  value: number
  disabled: boolean
  onChange: (value: number) => void
  options: { value: number; label: string; disabled?: boolean }[]
}

function CaptionSelect({ onChange, options, ...props }: CaptionSelectProps) {
  return (
    <span className='grid items-center'>
      <select
        {...props}
        onChange={(event) => onChange(Number(event.target.value))}
        className='is-interactive h-8 appearance-none rounded-full emphasis-subtler border border-transparent ps-3 pe-7 text-sm font-semibold text-strong [grid-area:1/1] [&_option]:bg-raised [&_option]:text-normal'
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <CaretDownIcon
        weight='bold'
        aria-hidden='true'
        className='pointer-events-none me-2.5 size-3 justify-self-end [grid-area:1/1]'
      />
    </span>
  )
}
