'use client'

import { type ReactNode, useId, useRef, useState } from 'react'

import {
  CalendarBlankIcon,
  CaretDownIcon,
  LockSimpleIcon
} from '@phosphor-icons/react'

import {
  type DateRangeValue,
  addMonths,
  compareDates,
  formatDateRange,
  joinWithFact
} from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import {
  PickerDrawerHeader,
  PickerOverlay,
  PickerTrigger,
  useMediaMatch,
  usePickerLabels,
  usePickerOpen,
  usePickerSurface,
  usePickerZone
} from '../../pickers/PickerShell'
import { formatDate } from '../../pickers/readDate'
import { Button } from '../Button'
import { Calendar } from '../Calendar'
import { type CalendarDateRange, withinLength } from '../Calendar/selection'
import { useToday } from '../Calendar/today'
import { Drawer } from '../Drawer'
import { useFieldContext } from '../Field'
import { selectTriggerVariants } from '../Select/variants'
import { Tabs } from '../Tabs'
import type { DateRangePickerProps } from './DateRangePicker'
import { PeriodList } from './PeriodList'
import { PresetList } from './PresetList'
import { RangeEndField } from './RangeEndField'
import {
  type DateRangePreset,
  type RangeContext,
  type RangeDraft,
  dateRangePresets,
  describeRange,
  draftFrom,
  draftValue,
  readBack,
  sameRange
} from './range'

const WIDE = '(min-width: 64rem)'

type Edit = {
  draft: RangeDraft | null
  custom: boolean
  /** The calendar's first month, once a preset or typed date has moved it. */
  month: string | null
}
const NO_EDIT: Edit = { draft: null, custom: false, month: null }

const days = (count: number | undefined) =>
  `${count} ${count === 1 ? 'day' : 'days'}`

function noonOf(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

const DAY = 24 * 60 * 60 * 1000

/** The chosen dates in a line: "4 Sept to 3 Oct 2026 · 30 days". */
function summarise(
  start: string | null,
  end: string | null,
  locale: string | undefined,
  reversed: boolean
): string {
  const options = { timeZone: 'UTC', dateStyle: 'medium', locale } as const
  if (reversed || (start && end && compareDates(start, end) > 0))
    return 'Ends before it starts'
  if (start && end) {
    const count = (noonOf(end).getTime() - noonOf(start).getTime()) / DAY + 1
    return joinWithFact(
      formatDateRange(noonOf(start), noonOf(end), options) ?? '',
      days(count)
    )
  }
  if (start) return `From ${formatDate(start, options)}`
  if (end) return `Until ${formatDate(end, options)}`
  return 'No dates chosen'
}

type View = 'periods' | 'calendar'

// Two lines in exactly a large control's height, with fixed line heights so
// every engine's font metrics land on 48px.
const twoLineClasses = {
  button: 'h-12 px-2',
  first: 'truncate text-base leading-5',
  second: 'text-sm leading-4'
}

/** For pickers built on this one, such as `DashboardPeriod`. Not public. */
export type DateRangePickerExtension = {
  /**
   * Below the range: under the calendar in a popover, over the actions in a
   * drawer. Given the range as edited, or null while it can't be read.
   */
  extra?: (range: DateRangeValue | null) => ReactNode
  /** Apply sends the range here, changed or not, in place of `onValueChange`. */
  onApply?: (range: DateRangeValue | null) => void
  /**
   * `false` keeps a range always chosen: no Clear, and no Apply while both
   * dates are empty, without calling the picker required.
   */
  clearable?: boolean
  /** A quieter second line on the button, read in its name too. */
  valueSuffix?: string | null
}

/** DateRangePicker, with the hooks pickers built on it need. */
export function ExtendedDateRangePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  presets = dateRangePresets,
  commit = 'immediate',
  granularity = 'day',
  timeZone,
  today: todayProp,
  weekStart,
  fiscalYearStart,
  locale,
  disabled,
  invalid,
  readOnly,
  required,
  size = 'md',
  emphasis,
  placeholder = 'Choose dates',
  numberOfMonths,
  min,
  max,
  captionLayout,
  startMonth,
  endMonth,
  hourCycle,
  minuteStep,
  open: openProp,
  defaultOpen,
  onOpenChange,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  extra,
  onApply,
  clearable = true,
  valueSuffix,
  ...props
}: DateRangePickerProps & DateRangePickerExtension) {
  const field = useFieldContext()
  const zone = usePickerZone(timeZone)
  const today = useToday(todayProp, zone)
  const context: RangeContext = {
    // Read against noon of today in UTC, so the dates are today's wherever
    // the code runs.
    options: today
      ? { now: noonOf(today), timeZone: 'UTC', weekStart, fiscalYearStart }
      : null,
    zone
  }
  const isDisabled = disabled === true || !!field.disabled
  const disabledDays = typeof disabled === 'boolean' ? undefined : disabled
  const isInvalid = invalid ?? field.invalid
  const isRequired = required ?? field.required
  const withTime = granularity === 'minute'

  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? null)
  const value = valueProp !== undefined ? valueProp : uncontrolled
  // A value from outside replaces an open edit; the one just emitted does not.
  const [sync, setSync] = useState<{
    seen: DateRangeValue | null
    emitted?: DateRangeValue | null
  }>({ seen: value })
  const [edit, setEdit] = useState<Edit>(NO_EDIT)
  if (!sameRange(sync.seen, value)) {
    setSync({ seen: value })
    if (sync.emitted === undefined || !sameRange(value, sync.emitted))
      setEdit(NO_EDIT)
  }
  function emit(next: DateRangeValue | null) {
    if (sameRange(next, value)) return
    setSync({ ...sync, emitted: next })
    if (valueProp === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  const [open, setOpen] = usePickerOpen({
    open: openProp,
    defaultOpen,
    onOpenChange
  })
  // Each opening starts from the value, however it opens or closes, so an
  // edit left by a click outside never comes back.
  const [seenOpen, setSeenOpen] = useState(open)
  // The phone's tab and the end a tap sets, each chosen by the person.
  const [chosenView, setChosenView] = useState<View | null>(null)
  const [picking, setPicking] = useState<'start' | 'end' | null>(null)
  const [cleared, setCleared] = useState(0)
  if (seenOpen !== open) {
    setSeenOpen(open)
    setEdit(NO_EDIT)
    setChosenView(null)
    setPicking(null)
  }
  const surface = usePickerSurface(open)
  const draft = edit.draft ?? draftFrom(value, context)
  const length = { min, max }
  const result = draftValue(draft, granularity, zone, length)
  const wideScreen = useMediaMatch(WIDE)
  // The drawer's months scroll, so one is the first in view.
  const months =
    surface === 'drawer'
      ? 1
      : Math.max(1, Math.floor(numberOfMonths ?? (wideScreen ? 2 : 1)))

  function changeOpen(next: boolean) {
    if (next && (isDisabled || readOnly)) return
    setOpen(next)
  }

  function change(
    next: RangeDraft,
    { close = false, month }: { close?: boolean; month?: string | null } = {}
  ) {
    setEdit({
      draft: {
        ...next,
        start: readBack(next.start, granularity, zone),
        end: readBack(next.end, granularity, zone)
      },
      custom: edit.custom && next.chosen === null,
      month: month ?? edit.month ?? shownMonth ?? null
    })
    if (commit === 'apply') return
    const nextResult = draftValue(next, granularity, zone, length)
    if (nextResult.kind !== 'value') return
    emit(nextResult.value)
    if (close) changeOpen(false)
  }

  const firstOf = (date: string) => `${date.slice(0, 8)}01`
  const opening = draftFrom(value, context)
  const openingDate = opening.start.date ?? opening.end.date ?? today
  const shownMonth =
    edit.month ?? (openingDate ? firstOf(openingDate) : undefined)

  /** The first month to show so `date` is in view, moving only if it isn't. */
  const monthShowing = (date: string | null, last = false) => {
    if (!date) return null
    const month = firstOf(date)
    if (
      shownMonth &&
      compareDates(month, shownMonth) >= 0 &&
      compareDates(month, addMonths(shownMonth, months - 1)) <= 0
    )
      return shownMonth
    return addMonths(month, last ? 1 - months : 0)
  }

  const description =
    value === null ? null : describeRange(value, context, locale)
  const labels = usePickerLabels({
    action: 'Choose dates',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    valueText: description
      ? [description.label, description.detail, valueSuffix]
          .filter(Boolean)
          .join(', ')
      : undefined
  })

  const pressed =
    edit.custom || result.kind !== 'value'
      ? 'custom'
      : result.value === null
        ? null
        : (presets.find((preset) => sameRange(preset.value, result.value)) ??
          'custom')

  const anchorRef = useRef<HTMLButtonElement>(null)
  const startRef = useRef<HTMLInputElement>(null)
  const requiredId = useId()
  const describedBy =
    [
      isInvalid ? field.errorTextId : field.helperTextId,
      isRequired && requiredId,
      ariaDescribedBy
    ]
      .filter(Boolean)
      .join(' ') || undefined
  const readOptions = {
    today: today ?? undefined,
    timeZone: zone,
    weekStart,
    dateStyle: 'medium' as const,
    disabled: disabledDays
  }
  const endError =
    result.kind === 'reversed'
      ? 'Ends before it starts'
      : result.kind === 'too-long'
        ? `Spans more than ${days(max)}`
        : result.kind === 'too-short'
          ? `Spans fewer than ${days(min)}`
          : null
  const locked = isDisabled || readOnly
  const twoLines = !!description && !!valueSuffix
  const drawer = surface === 'drawer'
  const hasPresets = presets.length > 0
  // Opens on the presets when the value is one of them.
  const view: View = !hasPresets
    ? 'calendar'
    : (chosenView ??
      (presets.some((preset) => sameRange(preset.value, value))
        ? 'periods'
        : 'calendar'))

  const pressedDay = useRef<string | null>(null)
  function pickDays(pressed: CalendarDateRange) {
    // Escape mid-range clears the calendar; drop the edit instead.
    if (pressed.start === null) {
      setEdit({ ...edit, draft: null })
      return
    }
    const day = pressedDay.current
    const { date: start } = draft.start
    const { date: end } = draft.end
    // With only an end typed, a day up to it becomes the start.
    const typedEnd = start === null && end
    let range =
      typedEnd &&
      pressed.end === null &&
      compareDates(pressed.start, typedEnd) <= 0
        ? { start: pressed.start, end: typedEnd }
        : pressed
    // A tap on the end being picked moves only that end. One the range's
    // length refuses changes nothing, rather than starting over there.
    // A refused end is still set, so its field says why: before the start,
    // or past min or max.
    if (day && picking === 'end' && start) {
      range = { start, end: day }
    } else if (day && picking === 'start') {
      range =
        end && compareDates(day, end) <= 0 && withinLength(day, end, length)
          ? { start: day, end }
          : { start: day, end: null }
    }
    setPicking(null)
    change(
      {
        chosen: null,
        start: { ...draft.start, date: range.start, unreadable: false },
        end: { ...draft.end, date: range.end, unreadable: false }
      },
      { close: !withTime && range.end !== null }
    )
  }

  const calendarProps = {
    selected: {
      start: draft.start.date ?? draft.end.date,
      end: draft.end.date
    },
    onSelect: pickDays,
    // The day pressed, which the selection alone can't say.
    onClickCapture: (event: { target: EventTarget }) => {
      pressedDay.current =
        (event.target as Element).closest<HTMLElement>('button[data-date]')
          ?.dataset.date ?? null
    },
    disabled: locked || disabledDays,
    month: shownMonth,
    onMonthChange: (month: string) => setEdit({ ...edit, month }),
    // Picking the start anew, so the old start's length limits don't apply.
    min: picking === 'start' ? undefined : min,
    max: picking === 'start' ? undefined : max,
    today: todayProp,
    timeZone: zone,
    weekStart,
    locale,
    startMonth,
    endMonth
  }

  const pickingEnd =
    picking ?? (draft.start.date && !draft.end.date ? 'end' : 'start')
  const endFields = (
    <div
      className={cn(
        'grid items-start gap-3',
        withTime ? 'sm:grid-cols-2' : 'grid-cols-2'
      )}
    >
      <RangeEndField
        key={`start-${cleared}`}
        label='Start'
        parts={draft.start}
        onChange={(start) =>
          change(
            { ...draft, chosen: null, start },
            { month: monthShowing(start.date) }
          )
        }
        withTime={withTime}
        read={readOptions}
        hourCycle={hourCycle}
        minuteStep={minuteStep}
        locale={locale}
        disabled={locked}
        inputRef={startRef}
        picking={drawer && pickingEnd === 'start'}
        onFocus={drawer ? () => setPicking('start') : undefined}
      />
      <RangeEndField
        key={`end-${cleared}`}
        label='End'
        parts={draft.end}
        onChange={(end) =>
          change(
            { ...draft, chosen: null, end },
            { month: monthShowing(end.date, true) }
          )
        }
        error={endError}
        withTime={withTime}
        read={readOptions}
        hourCycle={hourCycle}
        minuteStep={minuteStep}
        locale={locale}
        disabled={locked}
        suggestFrom={draft.start.date}
        picking={drawer && pickingEnd === 'end'}
        onFocus={drawer ? () => setPicking('end') : undefined}
      />
    </div>
  )

  const applyDisabled =
    result.kind !== 'value' ||
    ((isRequired || !clearable) && result.value === null)
  function apply() {
    if (result.kind !== 'value') return
    if (onApply) onApply(result.value)
    else emit(result.value)
    changeOpen(false)
  }

  const footer = (
    <>
      {/* In a drawer, the header's Close cancels. */}
      {!drawer && (
        <Button size='sm' onClick={() => changeOpen(false)}>
          Cancel
        </Button>
      )}
      <Button
        size='sm'
        intent='accent'
        emphasis='strong'
        disabled={applyDisabled}
        onClick={apply}
      >
        Apply
      </Button>
    </>
  )

  const choosePreset = (preset: DateRangePreset) => {
    if (locked) return
    setPicking(null)
    const next = draftFrom(preset.value, context)
    change(next, { close: true, month: monthShowing(next.start.date) })
  }

  const extraShown = extra?.(result.kind === 'value' ? result.value : null)
  const empty =
    draft.chosen === null &&
    draft.start.date === null &&
    draft.end.date === null &&
    !draft.start.unreadable &&
    !draft.end.unreadable
  const calendarView = (
    <Calendar
      mode='range'
      layout='scroll'
      // The pinned weekdays run to the drawer's edges, padded back over the days.
      className='**:data-[slot=calendar-weekdays]:-mx-(--content-inset) **:data-[slot=calendar-weekdays]:px-(--content-inset)'
      {...calendarProps}
    />
  )
  const drawerContent: ReactNode = (
    <>
      <PickerDrawerHeader
        labelSource={labels.labelSource}
        action='Choose dates'
      >
        <Drawer.Description
          data-slot='date-range-picker-summary'
          className='text-sm'
        >
          {summarise(
            draft.start.date,
            draft.end.date,
            locale,
            result.kind === 'reversed'
          )}
        </Drawer.Description>
        {hasPresets && (
          <Tabs.List className='mt-2 grid w-full grid-cols-2'>
            <Tabs.Tab value='periods'>Periods</Tabs.Tab>
            <Tabs.Tab value='calendar'>Calendar</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
        )}
        {view === 'calendar' && <div className='mt-2'>{endFields}</div>}
      </PickerDrawerHeader>
      <Drawer.Body
        className={cn(
          commit !== 'apply' &&
            'pb-[max(--spacing(6),env(safe-area-inset-bottom))]'
        )}
      >
        {hasPresets ? (
          <>
            <Tabs.Panel value='periods'>
              <PeriodList
                presets={presets}
                chosen={pressed}
                onChoose={choosePreset}
                context={context}
                locale={locale}
              />
            </Tabs.Panel>
            <Tabs.Panel value='calendar'>{calendarView}</Tabs.Panel>
          </>
        ) : (
          calendarView
        )}
      </Drawer.Body>
      {(commit === 'apply' || extra) && (
        <Drawer.Footer className='grid flex-none justify-stretch gap-3'>
          {extraShown}
          {commit === 'apply' && (
            <div className='flex gap-2'>
              {clearable && (
                <Button
                  emphasis='subtle'
                  disabled={empty || locked}
                  onClick={() => {
                    setPicking(null)
                    // Remounted, so text that named nothing goes too.
                    setCleared(cleared + 1)
                    change({
                      chosen: null,
                      start: { date: null, time: null },
                      end: { date: null, time: null }
                    })
                  }}
                >
                  Clear
                </Button>
              )}
              <Button
                className='flex-1'
                intent='accent'
                emphasis='strong'
                disabled={applyDisabled || locked}
                onClick={apply}
              >
                Apply
              </Button>
            </div>
          )}
        </Drawer.Footer>
      )}
    </>
  )

  return (
    <div
      data-slot='date-range-picker'
      className={cn('grid min-w-0', className)}
      {...props}
    >
      {labels.labels}
      {isRequired && (
        <span id={requiredId} hidden>
          Required
        </span>
      )}
      <PickerOverlay
        open={open}
        onOpenChange={changeOpen}
        surface={surface}
        anchor={anchorRef}
        aria-labelledby={labels.popupLabelledBy}
        labelSource={labels.labelSource}
        action='Choose dates'
        className='overflow-y-auto'
        footer={commit === 'apply' && footer}
        drawerSize='lg'
        drawerContent={
          hasPresets ? (
            <Tabs
              value={view}
              onValueChange={(next) => {
                setChosenView(next as View)
                setPicking(null)
              }}
              className='contents'
            >
              {drawerContent}
            </Tabs>
          ) : (
            drawerContent
          )
        }
        initialFocus={(popup) =>
          popup.querySelector<HTMLElement>(
            '[data-slot="date-range-picker-preset"][aria-pressed="true"]:not([data-custom]), [data-slot="date-range-picker-periods"] [aria-current]'
          ) ??
          popup.querySelector<HTMLElement>(
            '[data-slot="calendar"] button[data-date][tabindex="0"]'
          )
        }
        trigger={
          <PickerTrigger
            ref={anchorRef}
            id={field.fieldId || undefined}
            disabled={isDisabled}
            aria-labelledby={labels.triggerLabelledBy}
            aria-describedby={describedBy}
            aria-invalid={isInvalid || undefined}
            aria-disabled={readOnly || undefined}
            data-readonly={readOnly || undefined}
            data-slot='date-range-picker-trigger'
            className={cn(
              selectTriggerVariants({ size, emphasis }),
              'gap-2 data-readonly:cursor-default',
              twoLines && twoLineClasses.button
            )}
          >
            <CalendarBlankIcon
              weight='bold'
              aria-hidden='true'
              className='size-4 shrink-0 text-subtle'
            />
            <span
              className={cn(
                'min-w-0 flex-1',
                twoLines && 'grid text-start',
                !twoLines && 'truncate',
                !description && 'text-subtle'
              )}
            >
              <span className={cn(twoLines && twoLineClasses.first)}>
                {description?.label ?? placeholder}
                {description?.detail && (
                  <span className='text-subtle'> {description.detail}</span>
                )}
              </span>
              {twoLines && (
                <span
                  data-slot='date-range-picker-suffix'
                  className={cn('truncate text-subtle', twoLineClasses.second)}
                >
                  {valueSuffix}
                </span>
              )}
            </span>
            {readOnly ? (
              <LockSimpleIcon
                weight='bold'
                aria-hidden='true'
                className='size-4 shrink-0 text-subtle'
              />
            ) : (
              <CaretDownIcon
                weight='bold'
                aria-hidden='true'
                className='size-4 shrink-0 text-subtle transition-transform duration-moderate in-data-popup-open:rotate-180'
              />
            )}
          </PickerTrigger>
        }
      >
        <div
          data-slot='date-range-picker-popup'
          className={cn(
            'grid gap-4',
            hasPresets && 'sm:grid-cols-[auto_minmax(0,1fr)]'
          )}
        >
          {hasPresets && (
            <PresetList
              presets={presets}
              pressed={pressed}
              locale={locale}
              disabled={locked}
              onChoose={choosePreset}
              onCustom={() => {
                setEdit({
                  ...edit,
                  draft: { ...draft, chosen: null },
                  custom: true
                })
                startRef.current?.focus()
              }}
            />
          )}
          <div className='grid content-start gap-4'>
            {endFields}
            <Calendar
              mode='range'
              numberOfMonths={months}
              captionLayout={captionLayout}
              {...calendarProps}
            />
            {extra && (
              <div className='border-t border-subtle pt-4'>{extraShown}</div>
            )}
          </div>
        </div>
      </PickerOverlay>
    </div>
  )
}
