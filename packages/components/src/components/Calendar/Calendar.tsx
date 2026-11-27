'use client'

import {
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  startTransition,
  useEffect,
  useId,
  useMemo,
  useOptimistic,
  useRef,
  useState
} from 'react'

import {
  CalendarDotsIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  RowsIcon
} from '@phosphor-icons/react'
import { cva } from 'class-variance-authority'

import {
  addDays,
  addMonths,
  compareDates,
  monthGrid,
  plainDateParts,
  startOfWeek
} from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import {
  type CalendarMatchers,
  matchesDate,
  modifierAttribute
} from '../../pickers/matchers'
import { mergeRefs } from '../../utils/mergeRefs'
import { surfaceClass, useSurface } from '../../utils/surface'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { IconButton } from '../Button/IconButton'
import { ToggleGroup } from '../ToggleGroup'
import { dayModel } from './day'
import { dateForKey } from './keys'
import {
  dayLabel,
  monthLabel,
  monthNames,
  nextAnnouncement,
  rangeLabel,
  weekCaption,
  weekdayNames
} from './labels'
import { between, monthNumberOf, monthOf, weekTouches, yearOf } from './months'
import { useScrollLayout } from './scrollLayout'
import {
  type CalendarDateRange,
  type CalendarMode,
  type CalendarSelection,
  lengthRule,
  selectDate
} from './selection'
import { type Peek, type SwipeStep, useSwipeToTurn } from './swipe'
import { useToday } from './today'
import { type MonthRun, viewModel } from './view'

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
   * Days to draw as a neutral band, shaped like a chosen range but not
   * chosen, such as dates typed but not yet taken. One day for a single day.
   */
  previewRange?: { start: string; end: string } | null
  /**
   * Months shown at once, side by side where they fit and stacked where
   * they don't. Paged only.
   *
   * @default 1
   */
  numberOfMonths?: number
  /**
   * `paged` turns the months with arrows. `scroll` stacks them in a list
   * that scrolls, under one pinned row of weekdays, adding months as it
   * nears either end. It opens on `month`, the selection or today, scrolls
   * to `month` when it changes, and in a box that scrolls calls
   * `onMonthChange` with the month at the top as it scrolls. Put it in a
   * `ScrollArea`, or a `Drawer` or `Pane` body, which already scroll.
   *
   * @default 'paged'
   */
  layout?: 'paged' | 'scroll'
  /**
   * The way a paged calendar turns: its arrows point this way and a finger
   * swipes this way. Vertical takes up and down swipes over the days, so the
   * page can't be scrolled from there. `layout='scroll'` always runs down the
   * page.
   *
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical'
  /**
   * `month` shows whole months. `week` shows one week in a row of larger days
   * that turns a week at a time. Paged only.
   * Pair with `onViewChange`.
   *
   * @default 'month'
   */
  view?: 'month' | 'week'
  /**
   * The view shown first when uncontrolled.
   *
   * @default 'month', or the first of `views` when it leaves month out
   */
  defaultView?: 'month' | 'week'
  /** Called with the new view when the reader switches it. */
  onViewChange?: (view: 'month' | 'week') => void
  /**
   * The views the reader can switch between. With both, a "Week" and
   * "Month" toggle group sits beside the title, or above several months,
   * showing only its icons where the calendar is narrow. A `defaultView`
   * outside the list gives way to its first view. Paged only.
   */
  views?: readonly ('month' | 'week')[]
  /**
   * Extra content under a day's number, such as a price or a status mark.
   * Return null, not an empty element, for a plain day. Every day becomes a
   * tile so the columns line up, and tiles grow to fit. Content fills its
   * tile and describes the day to screen readers. A disabled day with content
   * is struck through.
   */
  getDayContent?: (date: string) => ReactNode
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
  | CalendarSingleProps
  | CalendarMultipleProps
  | CalendarRangeProps

type AnyCalendarProps = CalendarBaseProps & {
  mode?: CalendarMode
  selected?: CalendarSelection
  defaultSelected?: CalendarSelection
  onSelect?(selected: CalendarSelection): void
  required?: boolean
  min?: number
  max?: number
}

export type CalendarLayout = 'paged' | 'scroll'
export type CalendarDirection = 'horizontal' | 'vertical'
export type CalendarView = 'month' | 'week'

const emptyRange = (): CalendarDateRange => ({ start: null, end: null })

const dayVariants = cva(
  'relative grid w-full border tabular-nums is-interactive',
  {
    variants: {
      shape: {
        circle:
          'mx-auto aspect-square max-w-12 place-content-center rounded-full text-sm',
        // Aspect ratio is a floor, so a tile grows to fit its content.
        tile: 'mx-auto aspect-square max-w-16 content-center justify-items-center gap-0.5 rounded-xl p-1 text-sm',
        week: 'mx-auto aspect-4/5 max-w-20 content-center justify-items-center gap-1 rounded-xl p-1 text-base'
      },
      look: {
        plain: 'emphasis-subtler border-transparent',
        filled: 'emphasis-subtle border-transparent',
        // Forced colours drop the fills, so a Highlight edge carries the state.
        chosen:
          'intent-accent emphasis-strong font-semibold forced-colors:border-[Highlight]',
        // The band is the cell's, so it runs edge to edge past the circle.
        middle:
          'intent-accent emphasis-subtler border-transparent forced-colors:border-[Highlight]',
        'middle-tile':
          'intent-accent emphasis-subtle border-transparent forced-colors:border-[Highlight]'
      },
      outside: { true: '', false: '' }
    },
    compoundVariants: [{ look: 'plain', outside: true, class: 'text-subtle' }]
  }
)

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
    previewRange: previewRangeProp,
    numberOfMonths: numberOfMonthsProp = 1,
    layout = 'paged',
    direction = 'horizontal',
    view: viewProp,
    defaultView: defaultViewProp,
    onViewChange,
    views,
    getDayContent,
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
  const monthsRef = useRef<HTMLDivElement>(null)
  useSurface(weekdaysRef, layout)
  useSurface(monthsRef, layout)
  const scrolling = layout === 'scroll'
  const captionLayout = scrolling ? 'label' : captionLayoutProp
  const [uncontrolledView, setUncontrolledView] = useState(() => {
    const preferred = defaultViewProp ?? 'month'
    return views?.length && !views.includes(preferred) ? views[0]! : preferred
  })
  // The view the reader last chose, so only their own switch is announced.
  const [toggledView, setToggledView] = useState<CalendarView | null>(null)
  const view = viewProp ?? uncontrolledView
  const weekView = view === 'week' && !scrolling
  const showViewToggle =
    !scrolling && !!views?.includes('week') && views.includes('month')
  const tiles = weekView || !!getDayContent
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
  // With nothing to place it, the month waits for the client to know today,
  // as a stand-in month that holds its room unseen.
  const waitingForToday = shownMonth === null
  const standIn = waitingForToday && !scrolling
  const estimated = waitingForToday && scrolling

  const [run, setRun] = useState<MonthRun | null>(null)
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  // Null until the reader turns a week.
  const [navigatedWeek, setNavigatedWeek] = useState<string | null>(null)
  const firstSelected = firstSelectedOf(mode, selection)
  const page = viewModel({
    scrolling,
    weekView,
    numberOfMonths: numberOfMonthsProp,
    startMonth,
    endMonth,
    weekStart,
    shownMonth,
    run,
    navigatedWeek,
    focusedDate,
    chosen:
      mode === 'multiple'
        ? (selection as readonly string[])
        : firstSelected
          ? [firstSelected]
          : [],
    today,
    disabled: disabled === true
  })
  const {
    numberOfMonths,
    firstAllowedMonth,
    lastAllowedMonth,
    minDate,
    maxDate,
    clampMonth,
    firstMonth,
    months,
    shownWeek,
    visibleStart,
    lastVisibleDay,
    isVisible,
    focusTarget,
    canTurn,
    monthOfWeek
  } = page
  // Several months that can't sit side by side page up and down, as one
  // column, whatever `direction` asks for.
  const [stacked, setStacked] = useState(false)
  const vertical = direction === 'vertical' || (stacked && numberOfMonths > 1)
  // Turning up and down, months move whole, each title in the gap above it.
  const wholeMonths = vertical
  const [hasFocus, setHasFocus] = useState(false)
  const [hoverDate, setHoverDate] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [pendingFocus, setPendingFocus] = useState<{ date: string } | null>(
    null
  )
  const servedFocus = useRef<{ date: string } | null>(null)
  const autoFocusDone = useRef(false)

  const labels = useMemo(
    () => ({
      weekdays: weekdayNames(weekStart, locale),
      months: monthNames(locale)
    }),
    [weekStart, locale]
  )

  const days = dayModel({
    mode,
    selection,
    min,
    max,
    disabled,
    minDate,
    maxDate,
    today,
    previewTarget: hoverDate ?? (hasFocus ? focusTarget : null),
    previewRange: previewRangeProp,
    showOutsideDays,
    tiles
  })
  const { extending, isOutOfRange } = days
  const isDayDisabled = days.isDisabled

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
    // Paging months leaves a turned week behind.
    setNavigatedWeek(null)
    changeMonth(next)
  }

  function showWeek(start: string, month: string) {
    setNavigatedWeek(start)
    if (!weekTouches(start, firstMonth)) changeMonth(month)
  }

  function turn(step: SwipeStep) {
    // Applied after a slide, so the bounds are checked as they are then.
    if (!canTurn(step)) return
    const to = page.turnTo(step)
    if (!to.week) return turnMonth(to.month)
    setPendingFocus(null)
    showWeek(to.week, to.month)
  }

  function changeView(next: CalendarView) {
    if (next === view) return
    // A turn waiting to land does so in the view it was pressed in.
    landTurn()
    reshape(() => {
      setPendingFocus(null)
      setToggledView(next)
      if (viewProp === undefined) {
        // In the same render, so the switch eases straight to the month.
        if (weekView) changeMonth(monthOfWeek(shownWeek))
        setUncontrolledView(next)
      }
      onViewChange?.(next)
    })
  }

  // Leaving week view, by the toggle or a parent, the month opens on the week
  // it showed, once the view has really changed.
  const weekLeft = useRef<string | null>(null)
  useIsomorphicLayoutEffect(() => {
    if (weekView) {
      weekLeft.current = shownWeek
      return
    }
    const week = weekLeft.current
    weekLeft.current = null
    if (week) changeMonth(monthOfWeek(week))
  })

  // Entering week view, by the toggle or a parent, a day picked in a later
  // month shown is the one the week should hold.
  function enterWeek(shown: { start: string; end: string }) {
    const chosen = [focusedDate, firstSelected].find(
      (date): date is string => !!date && between(date, shown.start, shown.end)
    )
    if (!chosen || monthOf(chosen) === firstMonth) return
    setNavigatedWeek(startOfWeek(chosen, weekStart))
    changeMonth(chosen)
  }
  const monthViewShown = useRef<{ start: string; end: string } | null>(null)
  useIsomorphicLayoutEffect(() => {
    const shown = monthViewShown.current
    // Held only while month view shows, so a week is entered once.
    monthViewShown.current = weekView
      ? null
      : { start: visibleStart, end: lastVisibleDay }
    if (weekView && shown) enterWeek(shown)
  })

  const swipeable = !scrolling && !waitingForToday && disabled !== true
  // The page a turn or a drag brings in, shown beside the days only then.
  const [peek, setPeek] = useState<Peek | null>(null)
  const { pageTurn, landTurn, dropTurn, reshape, reshaped } = useSwipeToTurn(
    rootRef,
    {
      enabled: swipeable,
      vertical,
      canTurn,
      turn,
      onPeek: setPeek
    }
  )
  // The switch eases in once the new view and its month have committed.
  const viewEased = useRef(view)
  useIsomorphicLayoutEffect(() => {
    if (viewEased.current === view) return
    viewEased.current = view
    reshaped()
  })
  // An incoming month beside several is as wide as each of them.
  useIsomorphicLayoutEffect(() => {
    const first = monthsRef.current?.querySelector(
      '[data-slot="calendar-month"]'
    )
    if (peek && first)
      monthsRef.current!.style.setProperty(
        '--calendar-month-size',
        `${first.getBoundingClientRect().width}px`
      )
  }, [peek])
  // Watched, as the container decides whether several months fit in a row.
  const paged = !scrolling && !waitingForToday
  useIsomorphicLayoutEffect(() => {
    const months = monthsRef.current
    if (!paged || numberOfMonths < 2 || !months) return setStacked(false)
    // From the width, not where the months sit, as a column is forced once
    // they stack. Read, not assumed: both scale with the root text size.
    const measure = () => {
      const month = months.querySelector('[data-slot="calendar-month"]')
      const least =
        (month && parseFloat(getComputedStyle(month).minWidth)) ||
        (month?.getBoundingClientRect().width ?? 0)
      const gap = parseFloat(getComputedStyle(months).columnGap) || 0
      setStacked(
        months.clientWidth < numberOfMonths * least + (numberOfMonths - 1) * gap
      )
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(months)
    return () => observer.disconnect()
  }, [paged, numberOfMonths])

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
  const shownMonthKey = waitingForToday
    ? null
    : weekView
      ? shownWeek
      : firstMonth
  // Null while the month follows today, so a midnight rollover isn't spoken.
  const chosenMonth = (weekView && navigatedWeek) || monthProp || navigatedMonth
  const [heard, setHeard] = useState({
    mode,
    selectionKey,
    selection,
    month: shownMonthKey,
    view
  })
  if (
    heard.mode !== mode ||
    heard.selectionKey !== selectionKey ||
    heard.month !== shownMonthKey ||
    heard.view !== view
  ) {
    const messages = []
    // A scrolled list is read as it scrolls; its months aren't announced.
    if (
      !scrolling &&
      heard.month &&
      shownMonthKey &&
      ((heard.view !== view && toggledView === view) ||
        (chosenMonth && heard.month !== shownMonthKey))
    )
      messages.push(
        weekView
          ? rangeLabel(shownWeek, addDays(shownWeek, 6), locale)
          : monthsLabel(shownMonthKey)
      )
    const selectionMessage =
      heard.mode === mode &&
      heard.selectionKey !== selectionKey &&
      describeSelection(heard.selection, selection)
    if (selectionMessage) messages.push(selectionMessage)
    setHeard({ mode, selectionKey, selection, month: shownMonthKey, view })
    if (toggledView) setToggledView(null)
    if (messages.length) {
      const message = messages.join('. ')
      setAnnouncement((said) => nextAnnouncement(said, message))
    }
  }

  function select(date: string) {
    if (isDayDisabled(date)) return
    if (isOutOfRange(date)) {
      const rule = lengthRule({ min, max })
      setAnnouncement((said) => nextAnnouncement(said, rule))
      return
    }
    const next = selectDate(mode, selection, date, { required, min, max })
    if (next === selection) return
    commit(next)
  }

  // The day's own onFocus records it, so the tab stop never moves to a day
  // that a controlled parent hasn't shown yet.
  function moveFocus(date: string) {
    setHoverDate(null)
    setPendingFocus({ date })
    const to = page.reveal(date)
    if (to.run) return setRun(to.run)
    if (to.week) return showWeek(to.week, to.month!)
    if (scrolling || weekView) return
    setNavigatedWeek(null)
    if (to.month) changeMonth(to.month)
  }

  // A turn applies after its slide out, so it reads the calendar as it is
  // then, and a second quick press builds on the first.
  const latestRef = useRef<{
    turn: typeof turn
    moveFocus: (date: string) => void
    turnMonth: (next: string) => void
    firstMonth: string
  } | null>(null)
  useIsomorphicLayoutEffect(() => {
    latestRef.current = { turn, moveFocus, turnMonth, firstMonth }
  })
  // Where a queued key turn will put focus, so a second press goes on from it.
  const queuedFocus = useRef<string | null>(null)

  // A parent's new month wins over a turn still sliding out from the old one.
  const parentMonth = monthProp && monthOf(monthProp)
  const heldMonth = useRef(parentMonth)
  useIsomorphicLayoutEffect(() => {
    if (heldMonth.current === parentMonth) return
    heldMonth.current = parentMonth
    queuedFocus.current = null
    dropTurn()
  }, [parentMonth, dropTurn])

  function pickMonth(first: string) {
    // From the month a waiting turn lands on, so the slide runs the right way.
    landTurn()
    const latest = latestRef.current!
    const step = compareDates(monthOf(first), latest.firstMonth)
    if (!step) return
    pageTurn(step, () => latest.turnMonth(first), { immediate: true })
  }

  function onDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    if (event.key === 'Escape' && extending && disabled !== true) {
      event.preventDefault()
      event.stopPropagation()
      commit(emptyRange())
      return
    }
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    // A queued Page key turn goes on from where it will land.
    const from = queuedFocus.current ?? date
    const next = dateForKey(event.key, from, {
      shiftKey: event.shiftKey,
      weekStart,
      rtl
    })
    if (!next) return
    event.preventDefault()
    if (disabled === true && !isVisible(next)) return
    // Page keys turn with the slide; arrow keys stay instant, so focus is
    // never on a day that is sliding away.
    // Only a Page key that reaches the page beside slides; Shift's year and
    // a week view's month skip past it, so they turn at once.
    if (
      event.key.startsWith('Page') &&
      !scrolling &&
      !event.shiftKey &&
      !weekView
    ) {
      const target = page.clampDate(next)
      if (target === from) return
      if (isVisible(target) && !queuedFocus.current) return moveFocus(target)
      queuedFocus.current = target
      pageTurn(compareDates(target, from) > 0 ? 1 : -1, () => {
        if (queuedFocus.current === target) queuedFocus.current = null
        latestRef.current!.moveFocus(target)
      })
      return
    }
    landTurn()
    latestRef.current!.moveFocus(page.clampDate(next))
  }

  // Not on a page coming in, which can show the same dates and is inert.
  const findDay = (date: string) =>
    rootRef.current?.querySelector<HTMLButtonElement>(
      `button[data-date="${date}"]:not([data-outside]):not([data-peek] *)`
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
  // Once, as on an input, but only after hydration knows today.
  useEffect(() => {
    if (autoFocusDone.current || !todayKnown) return
    autoFocusDone.current = true
    if (autoFocus) focusDay(focusTarget)
  })

  const { earlierRef, laterRef, canAddEarlier, canAddLater } = useScrollLayout(
    rootRef,
    weekdaysRef,
    {
      active: scrolling && !waitingForToday,
      page,
      run,
      setRun,
      changeMonth,
      onMonthChange
    }
  )

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
          className='truncate text-sm font-semibold text-strong'
        >
          {label}
        </div>
      )
    }
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
      <div className='flex gap-1'>
        <span id={captionId} className='sr-only'>
          {label}
        </span>
        <CaptionSelect
          aria-label='Month'
          value={monthNumber}
          disabled={navDisabled}
          onChange={(value) => {
            pickMonth(addMonths(month, value - monthNumber - index))
          }}
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
          onChange={(value) =>
            pickMonth(addMonths(month, (value - year) * 12 - index))
          }
          options={Array.from({ length: lastYear - firstYear + 1 }, (_, i) => ({
            value: firstYear + i,
            label: String(firstYear + i),
            disabled: !yearHoldsAllowedMonth(firstYear + i)
          }))}
        />
      </div>
    )
  }

  function renderDay(
    date: string,
    month: string,
    column: number,
    idSuffix = ''
  ) {
    const day = days.day(date, month, column)
    if (!day) return <td key={date} role='gridcell' className='p-0' />
    const { outside, selected, rangeStart, rangeEnd, previewBand } = day
    const content = getDayContent?.(date)
    const hasContent = content != null && content !== false && content !== ''
    const look = day.look === 'plain' && hasContent ? 'filled' : day.look
    const isDisabled = day.disabled
    const isToday = day.today
    const isFocusTarget = !outside && date === focusTarget
    const contentId = hasContent
      ? `${id}-content-${month}-${date}${idSuffix}`
      : undefined

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
          day.band && 'bg-subtle intent-accent',
          day.band && day.firstVisible && 'rounded-s-full',
          day.band && day.lastVisible && 'rounded-e-full',
          previewBand && 'bg-subtle',
          previewBand?.roundStart && 'rounded-s-full',
          previewBand?.roundEnd && 'rounded-e-full',
          day.halfBand &&
            "before:absolute before:inset-y-0 before:w-1/2 before:bg-subtle before:content-[''] before:intent-accent",
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
          data-range-middle={day.rangeMiddle ? '' : undefined}
          data-range-end={rangeEnd ? '' : undefined}
          data-range-preview={day.previewing ? '' : undefined}
          data-previewed={day.previewed ? '' : undefined}
          data-today={isToday ? '' : undefined}
          data-outside={outside ? '' : undefined}
          data-disabled={isDisabled ? '' : undefined}
          data-out-of-range={day.outOfRange ? '' : undefined}
          data-focused={hasFocus && isFocusTarget ? '' : undefined}
          data-content={hasContent ? '' : undefined}
          aria-label={[
            isToday && 'Today',
            dayLabel(date, locale),
            selected && 'selected'
          ]
            .filter(Boolean)
            .join(', ')}
          aria-describedby={contentId}
          aria-disabled={isDisabled || undefined}
          aria-current={isToday ? 'date' : undefined}
          tabIndex={isFocusTarget ? 0 : -1}
          className={cn(
            dayVariants({
              shape: weekView ? 'week' : tiles ? 'tile' : 'circle',
              look,
              outside
            }),
            day.outOfRange && 'opacity-50',
            // Scrolled into view below the pinned weekdays, not under them.
            scrolling && 'scroll-mt-10'
          )}
          onClick={() => {
            if (!weekView) setNavigatedWeek(null)
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
          {tiles ? (
            <span
              data-slot='calendar-day-number'
              className={cn(
                isDisabled && hasContent
                  ? 'line-through'
                  : isToday && 'underline decoration-2 underline-offset-4'
              )}
            >
              {plainDateParts(date).day}
            </span>
          ) : (
            // Bare in compact days, as a scrolling list renders hundreds.
            plainDateParts(date).day
          )}
          {hasContent && (
            <span
              id={contentId}
              data-slot='calendar-day-content'
              className={cn(
                'grid justify-items-center gap-0.5 text-xs leading-tight font-normal',
                look !== 'chosen' && 'text-subtle'
              )}
            >
              {content}
            </span>
          )}
          {isToday && !tiles && (
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

  // The toggle stays in the header in both views, so it keeps focus as the
  // view changes how many months show.
  // In a header row of its own when months move up and down as a column, so
  // they slide beneath the arrows rather than over them.
  const inlineNav =
    !scrolling && (numberOfMonths === 1 || showViewToggle || wholeMonths)
  const monthCaptions = scrolling || numberOfMonths > 1
  const unit = weekView ? 'week' : 'month'
  const PreviousIcon = vertical ? CaretUpIcon : CaretLeftIcon
  const NextIcon = vertical ? CaretDownIcon : CaretRightIcon
  const arrowClass = cn('size-4', !vertical && 'rtl:-scale-x-100')
  const viewToggle = showViewToggle && (
    <ViewToggle view={view} onChange={changeView} />
  )
  const nav = (
    <div
      data-slot='calendar-nav'
      className={cn(
        'flex gap-1',
        // Above the months, which are positioned for the pages that come in.
        inlineNav ? 'ms-auto' : 'absolute end-0 top-0 z-1'
      )}
    >
      <IconButton
        emphasis='subtler'
        size='sm'
        aria-label={`Previous ${unit}`}
        disabled={!canTurn(-1)}
        onClick={() => pageTurn(-1, () => latestRef.current!.turn(-1))}
      >
        <PreviousIcon weight='bold' className={arrowClass} />
      </IconButton>
      <IconButton
        emphasis='subtler'
        size='sm'
        aria-label={`Next ${unit}`}
        disabled={!canTurn(1)}
        onClick={() => pageTurn(1, () => latestRef.current!.turn(1))}
      >
        <NextIcon weight='bold' className={arrowClass} />
      </IconButton>
    </div>
  )

  const weekLabel = rangeLabel(shownWeek, addDays(shownWeek, 6), locale)
  const headerCaption = weekView ? (
    captionLayout === 'dropdown' ? (
      renderCaption(firstMonth, 0)
    ) : (
      // Short month names where the full ones would be cut off.
      <div className='text-sm font-semibold text-strong'>
        <span className='block truncate @max-md/calendar-header:hidden'>
          {weekCaption(shownWeek, addDays(shownWeek, 6), locale)}
        </span>
        <span className='hidden truncate @max-md/calendar-header:block'>
          {weekCaption(shownWeek, addDays(shownWeek, 6), locale, 'short')}
        </span>
      </div>
    )
  ) : (
    renderCaption(firstMonth, 0)
  )

  // Turning up and down, one still weekday row sits under the header, and the
  // days move in a viewport of their own below it.
  const pinnedWeekdays = vertical && !scrolling
  // Out of the flow, in the gap above its days, so every month in a column
  // takes the same room before its days and the column moves as one strip.
  const stripTitleClass =
    'absolute inset-x-0 bottom-full mb-2 grid h-8 items-center'
  const header = (
    <div
      data-slot='calendar-header'
      // The views and arrows sit close as one set, leaving a phone's long
      // week title its room.
      className='@container/calendar-header flex h-8 items-center gap-1'
    >
      {/* A column of months shows its first month's title here, by the arrows. */}
      {(!monthCaptions || wholeMonths) && (
        <div className='me-1 min-w-0'>{headerCaption}</div>
      )}
      {viewToggle}
      {nav}
    </div>
  )

  const swipeAxis = vertical ? 'touch-pan-x' : 'touch-pan-y'

  function renderRows(start: string, idSuffix = '') {
    if (weekView)
      return (
        <tr role='row'>
          {Array.from({ length: 7 }, (_, column) => {
            const date = addDays(start, column)
            return renderDay(date, monthOf(date), column, idSuffix)
          })}
        </tr>
      )
    return monthGrid(yearOf(start), monthNumberOf(start), {
      weekStart,
      fixedWeeks
    }).map((week) => (
      <tr key={week[0]} role='row'>
        {week.map((date, column) => renderDay(date, start, column, idSuffix))}
      </tr>
    ))
  }

  // The page a turn brings in, beside the days. Its titles and weekday row
  // hold space but stay hidden, as the shown ones hold still; on a vertical
  // single page its title comes in with its days.
  function renderPeek({ step, side }: Peek) {
    const start = weekView
      ? addDays(shownWeek, step * 7)
      : addMonths(firstMonth, step === 1 ? numberOfMonths : -1)
    const several = numberOfMonths > 1
    const sides: Record<Peek['side'], string> = {
      right: several
        ? 'top-0 left-[calc(100%+--spacing(6))]'
        : 'top-0 left-full',
      left: several
        ? 'top-0 right-[calc(100%+--spacing(6))]'
        : 'top-0 right-full',
      bottom: 'start-0 top-[calc(100%+--spacing(14))]',
      top: 'start-0 bottom-[calc(100%+--spacing(14))]'
    }
    return renderPeekPage(
      start,
      cn(sides[side], several ? 'w-(--calendar-month-size)' : 'w-full')
    )
  }

  function renderPeekPage(start: string, placement: string) {
    const several = numberOfMonths > 1
    // Its title shows where titles travel: a vertical page, or whole months.
    const title = vertical
    return (
      <div
        key={start}
        data-peek=''
        data-swipe-part=''
        aria-hidden='true'
        inert
        className={cn(
          'absolute grid content-start gap-2 in-data-dragging:will-change-transform',
          placement
        )}
      >
        {(title || (several && monthCaptions)) && (
          <div
            className={cn(
              'grid h-8 items-center truncate text-sm font-semibold text-strong',
              title ? stripTitleClass : 'invisible'
            )}
          >
            {weekView
              ? weekCaption(start, addDays(start, 6), locale)
              : monthLabel(start, locale)}
          </div>
        )}
        <table
          className={cn(
            'w-full table-fixed border-separate',
            tiles
              ? 'border-spacing-1'
              : 'border-spacing-x-0 border-spacing-y-0.5'
          )}
        >
          {/* As the shown months' own, so the pages take the same height. */}
          <thead className={pinnedWeekdays ? 'sr-only' : 'invisible'}>
            <tr>
              {labels.weekdays.map((weekday) => (
                <th
                  key={weekday.long}
                  className='h-8 p-0 text-xs font-medium text-subtle'
                >
                  {weekday.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody data-slot='calendar-days'>{renderRows(start, '-peek')}</tbody>
        </table>
      </div>
    )
  }

  const monthsShown = estimated
    ? months.slice(0, 1).map((month) => (
        <div
          key={month}
          aria-hidden='true'
          className='@container min-w-70 flex-[1_1_--spacing(70)]'
        >
          {/* Estimated, so the page doesn't jump when the client fills it in. */}
          <div
            className={
              weekView
                ? 'h-[calc(min(100cqi/7-var(--spacing),--spacing(20))*1.25+--spacing(21))]'
                : tiles
                  ? 'h-[calc(min(100cqi/7-var(--spacing),--spacing(16))*6+--spacing(26))]'
                  : 'h-[calc(min(100cqi/7,--spacing(12))*6+--spacing(22))]'
            }
          />
        </div>
      ))
    : months.map((month, index) => (
        <div
          // By position, so the selects keep focus as months turn.
          key={scrolling ? month : index}
          data-slot='calendar-month'
          data-month={month}
          // Contained, so a month asks for 280px and takes whatever more it is given.
          data-swipe-part={wholeMonths && !scrolling ? '' : undefined}
          className={cn(
            'grid min-w-70 flex-[1_1_--spacing(70)] content-start gap-2 [contain:inline-size]',
            wholeMonths && 'relative in-data-dragging:will-change-transform',
            // Turning up and down, several months make one column.
            wholeMonths && !scrolling && 'basis-full'
          )}
        >
          {wholeMonths && index === 0 && (
            // The header names the first month, so this copy shows only as it
            // slides away above the days.
            <div
              aria-hidden='true'
              className={cn(
                'invisible truncate text-sm font-semibold text-strong in-data-swiping:visible',
                stripTitleClass
              )}
            >
              {weekView
                ? weekCaption(shownWeek, addDays(shownWeek, 6), locale)
                : monthLabel(month, locale)}
            </div>
          )}
          {monthCaptions && !(wholeMonths && index === 0) && (
            <div
              className={cn(
                'grid h-8 items-center',
                wholeMonths && stripTitleClass,
                // Clear of the arrows, which sit over whichever month is top right.
                !inlineNav && !scrolling && 'pe-17'
              )}
            >
              {renderCaption(month, index)}
            </div>
          )}
          <div className='grid'>
            <table
              role='grid'
              data-slot='calendar-grid'
              aria-multiselectable={mode !== 'single' || undefined}
              aria-label={weekView ? weekLabel : undefined}
              aria-labelledby={weekView ? undefined : `${id}-caption-${index}`}
              className={cn(
                'w-full table-fixed border-separate',
                tiles
                  ? 'border-spacing-1'
                  : 'border-spacing-x-0 border-spacing-y-0.5',
                swipeable && [swipeAxis, 'touch-pinch-zoom']
              )}
              onPointerLeave={() => setHoverDate(null)}
            >
              <thead
                className={scrolling || pinnedWeekdays ? 'sr-only' : undefined}
              >
                <tr role='row'>
                  {labels.weekdays.map((weekday) => (
                    <th
                      key={weekday.long}
                      role='columnheader'
                      scope='col'
                      aria-label={weekday.long}
                      className={cn(
                        'h-8 p-0 text-xs font-medium text-subtle',
                        // Only the days slide sideways, under a weekday row that holds still.
                        !scrolling &&
                          !vertical &&
                          'in-data-swiping:relative in-data-swiping:z-1 in-data-swiping:bg-(--records-surface,var(--pane-surface,var(--intent-bg-normal)))',
                        // Covers the border spacing, and no more.
                        !scrolling &&
                          !vertical &&
                          (tiles
                            ? 'in-data-swiping:shadow-[0_0_0_4px_var(--records-surface,var(--pane-surface,var(--intent-bg-normal)))]'
                            : 'in-data-swiping:shadow-[0_2px_0_0_var(--records-surface,var(--pane-surface,var(--intent-bg-normal))),0_-2px_0_0_var(--records-surface,var(--pane-surface,var(--intent-bg-normal)))]')
                      )}
                    >
                      {weekday.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                data-slot='calendar-days'
                data-swipe-part={wholeMonths ? undefined : ''}
                // Its own layer only while a finger holds it.
                className={
                  wholeMonths
                    ? undefined
                    : 'in-data-dragging:will-change-transform'
                }
              >
                {renderRows(weekView ? shownWeek : month)}
              </tbody>
            </table>
          </div>
        </div>
      ))

  return (
    <div
      ref={mergeRefs(rootRef, ref)}
      data-slot='calendar'
      data-layout={layout}
      data-direction={direction}
      data-paging={vertical ? 'vertical' : 'horizontal'}
      data-view={weekView ? 'week' : 'month'}
      data-tiles={tiles ? '' : undefined}
      className={cn(
        'relative grid w-full data-swiping:select-none',
        scrolling ? 'gap-6' : 'gap-2',
        standIn && 'invisible',
        className
      )}
      aria-hidden={standIn || undefined}
      inert={standIn}
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
      {scrolling ? (
        monthsShown
      ) : (
        <>
          {inlineNav && header}
          <div className={pinnedWeekdays ? 'grid' : 'contents'}>
            {pinnedWeekdays && (
              <div
                aria-hidden='true'
                data-slot='calendar-weekdays'
                className={cn(
                  'grid h-8 grid-cols-7 items-center text-center text-xs font-medium text-subtle',
                  // Matches the tiles' border spacing, so the columns line up.
                  tiles && 'gap-x-1 px-1'
                )}
              >
                {weekdayCells}
              </div>
            )}
            <div
              ref={monthsRef}
              data-slot='calendar-months'
              // The viewport the days move in, clipped as one so they run on from
              // one month into the next, and painted apart from what holds still.
              className={cn(
                'relative flex flex-wrap gap-x-6 in-data-swiping:isolate in-data-swiping:overflow-clip in-data-swiping:contain-paint',
                wholeMonths ? 'gap-y-14' : 'gap-y-4'
              )}
            >
              {!inlineNav && nav}
              {monthsShown}
              {peek && !waitingForToday && renderPeek(peek)}
            </div>
          </div>
        </>
      )}
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

// Icons alone in a narrow calendar, read from the header's own width.
const viewItems = [
  { value: 'week', label: 'Week', Icon: RowsIcon },
  { value: 'month', label: 'Month', Icon: CalendarDotsIcon }
] as const

/**
 * Shows the pressed view at once, ahead of the calendar it switches, which
 * renders over the frames that follow; it falls back if the view stays.
 */
function ViewToggle({
  view,
  onChange
}: {
  view: CalendarView
  onChange: (view: CalendarView) => void
}) {
  const [shown, show] = useOptimistic(view)
  return (
    <ToggleGroup<CalendarView>
      aria-label='View'
      size='sm'
      value={[shown]}
      onValueChange={([next]) => {
        if (!next) return
        // One transition, so the pressed view holds until the switch lands.
        startTransition(() => {
          show(next)
          onChange(next)
        })
      }}
      className='shrink-0'
    >
      {viewItems.map(({ value, label, Icon }) => (
        <ToggleGroup.Item
          key={value}
          value={value}
          aria-label={label}
          className='@max-md/calendar-header:aspect-square @max-md/calendar-header:px-0'
        >
          <Icon weight='bold' aria-hidden='true' className='size-3.5' />
          <span className='hidden @md/calendar-header:inline'>{label}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup>
  )
}

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
