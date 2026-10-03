'use client'

import {
  type ComponentProps,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'

import {
  CalendarBlankIcon,
  CaretDownIcon,
  LockSimpleIcon
} from '@phosphor-icons/react'

import type { DateRangeValue } from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import {
  PickerPopover,
  usePickerLabels,
  usePickerOpen,
  usePickerZone
} from '../../pickers/PickerShell'
import type { HourCycle } from '../../pickers/readTime'
import { Button } from '../Button'
import { Calendar } from '../Calendar'
import type { CalendarMatchers } from '../Calendar/matchers'
import { useToday } from '../Calendar/today'
import { useFieldContext } from '../Field'
import { Popover } from '../Popover'
import { selectTriggerVariants } from '../Select/variants'
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
  sameRange
} from './range'

export type DateRangePickerProps = Omit<
  ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
  /**
   * The range: absolute `{ start, end }` with inclusive ISO dates (or
   * date-times at `minute` granularity), or a relative range such as
   * `'last-week'` or `{ direction: 'past', amount: 30, unit: 'day' }`. Pair
   * with `onValueChange`.
   */
  value?: DateRangeValue | null
  /** The range to start from when uncontrolled. */
  defaultValue?: DateRangeValue | null
  /**
   * Called with a preset's value as given, so a relative choice stays
   * relative, or with absolute dates when they are chosen or typed. Null when
   * both dates are cleared.
   */
  onValueChange?: (value: DateRangeValue | null) => void
  /**
   * Choices beside the calendar, grouped by their `group`. Pass your own, or
   * add to `dateRangePresets`. An empty list hides it.
   *
   * @default dateRangePresets
   */
  presets?: readonly DateRangePreset[]
  /**
   * `immediate` changes the value with each choice. `apply` holds changes
   * until Apply is pressed, for a period that refetches a whole page.
   *
   * @default 'immediate'
   */
  commit?: 'immediate' | 'apply'
  /**
   * `minute` adds an optional time to each end. An end with no time covers
   * its whole day.
   *
   * @default 'day'
   */
  granularity?: 'day' | 'minute'
  /**
   * IANA zone whose calendar decides today and whose wall clock times are
   * read on. Defaults to the viewer's.
   */
  timeZone?: string
  /** Today as an ISO date. Defaults to today in `timeZone`. */
  today?: string
  /**
   * First day of the week, for the calendar and "last week": 1 is Monday and
   * 7 is Sunday.
   *
   * @default 1
   */
  weekStart?: number
  /**
   * The month the financial year opens, for financial presets.
   *
   * @default 7
   */
  fiscalYearStart?: number
  /** @default 'en-AU' */
  locale?: string
  /**
   * `true` turns the picker off. Matchers, as on `Calendar`, disable those
   * days in the calendar and refuse them when typed. Inherits `true` from
   * `Field`.
   */
  disabled?: boolean | CalendarMatchers
  /** Marks the picker as invalid. Inherits from `Field` when omitted. */
  invalid?: boolean
  /** Shows the range with a lock, without letting it change. */
  readOnly?: boolean
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default 'normal' */
  emphasis?: 'normal' | 'subtle'
  /** Shown while no range is chosen. @default 'Choose dates' */
  placeholder?: string
  /**
   * Months side by side. Defaults to two on wide screens and one on narrow.
   */
  numberOfMonths?: number
  /**
   * `dropdown` swaps the calendar's month name for month and year selects.
   *
   * @default 'label'
   */
  captionLayout?: 'label' | 'dropdown'
  /** The earliest month the calendar reaches, as any ISO date in it. */
  startMonth?: string
  /** The latest month the calendar reaches, as any ISO date in it. */
  endMonth?: string
  /**
   * At `minute` granularity, `12` reads "7:30pm" and `24` reads "19:30".
   *
   * @default 12
   */
  hourCycle?: HourCycle
  /**
   * At `minute` granularity, minutes per step of the time fields' arrow keys.
   *
   * @default 1
   */
  minuteStep?: number
  /** Whether the popup is open. Pair with `onOpenChange`. */
  open?: boolean
  /** Whether the popup starts open when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the popup opens or closes. */
  onOpenChange?: (open: boolean) => void
}

const WIDE = '(min-width: 64rem)'
function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const isWide = () => window.matchMedia(WIDE).matches

function noonOf(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

/** A button showing a date range, opening presets, typed dates and a calendar. */
export function DateRangePicker({
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
  size = 'md',
  emphasis,
  placeholder = 'Choose dates',
  numberOfMonths,
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
  ...props
}: DateRangePickerProps) {
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
  const withTime = granularity === 'minute'

  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? null)
  const value = valueProp !== undefined ? valueProp : uncontrolled
  function emit(next: DateRangeValue | null) {
    if (sameRange(next, value)) return
    if (valueProp === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  const [open, setOpen] = usePickerOpen({
    open: openProp,
    defaultOpen,
    onOpenChange
  })
  const [edit, setEdit] = useState<{
    draft: RangeDraft | null
    custom: boolean
  }>({ draft: null, custom: false })
  const draft = edit.draft ?? draftFrom(value, context)
  const result = draftValue(draft, granularity, zone)

  function changeOpen(next: boolean) {
    if (next && (isDisabled || readOnly)) return
    if (!next) setEdit({ draft: null, custom: false })
    setOpen(next)
  }

  function change(next: RangeDraft, { close = false } = {}) {
    setEdit({ draft: next, custom: edit.custom && next.chosen === null })
    if (commit === 'apply') return
    const nextResult = draftValue(next, granularity, zone)
    if (nextResult.kind !== 'value') return
    emit(nextResult.value)
    if (close) changeOpen(false)
  }

  const description =
    value === null ? null : describeRange(value, context, locale)
  const labels = usePickerLabels({
    action: 'Choose dates',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    valueText: description
      ? [description.label, description.detail].filter(Boolean).join(', ')
      : undefined
  })

  const pressed =
    edit.custom || result.kind !== 'value'
      ? 'custom'
      : result.value === null
        ? null
        : (presets.find((preset) => sameRange(preset.value, result.value)) ??
          'custom')

  const wideScreen = useSyncExternalStore(subscribeWide, isWide, () => false)
  const months = numberOfMonths ?? (wideScreen ? 2 : 1)

  const anchorRef = useRef<HTMLButtonElement>(null)
  const startRef = useRef<HTMLInputElement>(null)
  const describedBy =
    [isInvalid ? field.errorTextId : field.helperTextId, ariaDescribedBy]
      .filter(Boolean)
      .join(' ') || undefined
  const readOptions = {
    today: today ?? undefined,
    timeZone: zone,
    weekStart,
    dateStyle: 'medium' as const,
    disabled: disabledDays
  }
  const endError = result.kind === 'reversed' ? 'Ends before it starts' : null
  const locked = isDisabled || readOnly

  return (
    <div
      data-slot='date-range-picker'
      className={cn('grid min-w-0', className)}
      {...props}
    >
      {labels.labels}
      <PickerPopover
        open={open}
        onOpenChange={changeOpen}
        anchor={anchorRef}
        aria-labelledby={labels.popupLabelledBy}
        className='overflow-y-auto'
        initialFocus={(popup) =>
          popup.querySelector<HTMLElement>(
            '[data-slot="date-range-picker-preset"][aria-pressed="true"]:not([data-custom])'
          ) ??
          popup.querySelector<HTMLElement>(
            '[data-slot="calendar"] button[data-date][tabindex="0"]'
          )
        }
        field={
          <Popover.Trigger
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
              'gap-2 data-readonly:cursor-default'
            )}
          >
            <CalendarBlankIcon
              weight='bold'
              aria-hidden='true'
              className='size-4 shrink-0 text-subtle'
            />
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                !description && 'text-subtle'
              )}
            >
              {description?.label ?? placeholder}
              {description?.detail && (
                <span className='text-subtle'> {description.detail}</span>
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
          </Popover.Trigger>
        }
      >
        <div
          data-slot='date-range-picker-popup'
          className={cn(
            'grid gap-4',
            presets.length > 0 && 'sm:grid-cols-[auto_minmax(0,1fr)]'
          )}
        >
          {presets.length > 0 && (
            <PresetList
              presets={presets}
              pressed={pressed}
              locale={locale}
              disabled={locked}
              onChoose={(preset) => {
                change(draftFrom(preset.value, context), { close: true })
              }}
              onCustom={() => {
                setEdit({ draft: { ...draft, chosen: null }, custom: true })
                startRef.current?.focus()
              }}
            />
          )}
          <div className='grid content-start gap-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <RangeEndField
                label='Start'
                parts={draft.start}
                onChange={(start) => change({ ...draft, chosen: null, start })}
                withTime={withTime}
                read={readOptions}
                hourCycle={hourCycle}
                minuteStep={minuteStep}
                locale={locale}
                disabled={locked}
                inputRef={startRef}
              />
              <RangeEndField
                label='End'
                parts={draft.end}
                onChange={(end) => change({ ...draft, chosen: null, end })}
                error={endError}
                withTime={withTime}
                read={readOptions}
                hourCycle={hourCycle}
                minuteStep={minuteStep}
                locale={locale}
                disabled={locked}
              />
            </div>
            <Calendar
              mode='range'
              selected={{ start: draft.start.date, end: draft.end.date }}
              onSelect={(range) =>
                change(
                  {
                    chosen: null,
                    start: { ...draft.start, date: range.start },
                    end: { ...draft.end, date: range.end }
                  },
                  { close: !withTime && range.end !== null }
                )
              }
              disabled={locked || disabledDays}
              numberOfMonths={months}
              today={todayProp}
              timeZone={zone}
              weekStart={weekStart}
              locale={locale}
              captionLayout={captionLayout}
              startMonth={startMonth}
              endMonth={endMonth}
            />
          </div>
          {commit === 'apply' && (
            <div
              className={cn(
                'flex justify-end gap-2',
                presets.length > 0 && 'sm:col-span-2'
              )}
            >
              <Button size='sm' onClick={() => changeOpen(false)}>
                Cancel
              </Button>
              <Button
                size='sm'
                intent='accent'
                emphasis='strong'
                disabled={result.kind !== 'value'}
                onClick={() => {
                  if (result.kind !== 'value') return
                  emit(result.value)
                  changeOpen(false)
                }}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </PickerPopover>
    </div>
  )
}

DateRangePicker.displayName = 'DateRangePicker'
