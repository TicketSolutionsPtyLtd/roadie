'use client'

import { type ComponentProps, type ReactNode, useState } from 'react'

import {
  type Comparison,
  type ComparisonOptions,
  type DateRangeValue,
  describeDateRange,
  isAbsoluteRange,
  resolveComparison
} from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import { usePickerZone } from '../../pickers/PickerShell'
import { useToday } from '../Calendar/today'
import { ExtendedDateRangePicker } from '../DateRangePicker/ExtendedDateRangePicker'
import { type DateRangePreset, sameRange } from '../DateRangePicker/range'
import { Switch } from '../Switch'
import { ToggleGroup } from '../ToggleGroup'
import { dashboardPeriodPresets } from './presets'

/** A dashboard's period and what it compares with. No `compare`, no comparison. */
export type DashboardPeriodValue = {
  range: DateRangeValue
  compare?: Comparison
}

export type DashboardPeriodProps = Omit<
  ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
  /** The period and its comparison. Pair with `onValueChange`. */
  value?: DashboardPeriodValue
  /**
   * The period to start from when uncontrolled.
   *
   * @default { range: { direction: 'past', amount: 30, unit: 'day' }, compare: 'previous-period' }
   */
  defaultValue?: DashboardPeriodValue
  /**
   * Called when Apply is pressed with the period and its comparison. Each
   * change refetches the dashboard, so both wait for Apply.
   */
  onValueChange?: (value: DashboardPeriodValue) => void
  /**
   * The period's presets, as on `DateRangePicker`.
   *
   * @default dashboardPeriodPresets
   */
  presets?: readonly DateRangePreset[]
  /**
   * The first day the data holds, as given to `resolveComparison`, so each
   * comparison lists the dates the app will fetch.
   */
  dataStart?: string
  /**
   * The last day the data holds, as given to `resolveComparison`. Only for
   * data recorded as it happens, such as sales.
   */
  dataEnd?: string
  /** Previous year goes back 52 weeks, as given to `resolveComparison`. */
  alignWeekday?: boolean
  /** Shows the period with a lock, without letting it change. */
  readOnly?: boolean
  disabled?: boolean
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default 'normal' */
  emphasis?: 'normal' | 'subtle' | 'subtler'
  /**
   * IANA zone whose calendar decides today. Defaults to the viewer's.
   */
  timeZone?: string
  /** Today as an ISO date. Defaults to today in `timeZone`. */
  today?: string
  /** @default 1 */
  weekStart?: number
  /** @default 7 */
  fiscalYearStart?: number
  /** @default 'en-AU' */
  locale?: string
  /** The app's own controls, such as a benchmark, placed after the period. */
  children?: ReactNode
}

type Choice = 'previous-period' | 'previous-year' | 'custom'

const CHOICES: { value: Choice; label: string }[] = [
  { value: 'previous-period', label: 'Previous period' },
  { value: 'previous-year', label: 'Previous year' },
  { value: 'custom', label: 'Custom dates' }
]

const HISTORY = {
  partial: 'Not enough history',
  unavailable: 'Nothing to compare'
} as const

const DEFAULT_VALUE: DashboardPeriodValue = {
  range: { direction: 'past', amount: 30, unit: 'day' },
  compare: 'previous-period'
}

function choiceOf(compare: Comparison): Choice {
  return isAbsoluteRange(compare) ? 'custom' : compare
}

function noonOf(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

const sameComparison = (a?: Comparison, b?: Comparison) =>
  typeof a !== 'object' || typeof b !== 'object' ? a === b : sameRange(a, b)

/** The dates a comparison covers, or why there are none to show. */
function compared(
  range: DateRangeValue | null,
  compare: Comparison,
  options: ComparisonOptions | null,
  locale: string | undefined
): { dates: string | null; note: string | null } {
  if (!options || !range) return { dates: null, note: null }
  try {
    const { status, range: covered } = resolveComparison(
      range,
      compare,
      options
    )
    const dates =
      covered?.kind === 'dates'
        ? describeDateRange(
            { start: covered.start, end: covered.end },
            { ...options, locale }
          ).detail
        : null
    return { dates, note: status === 'available' ? null : HISTORY[status] }
  } catch {
    return { dates: null, note: null }
  }
}

/** A dashboard's period, with what it compares with, in one picker. */
export function DashboardPeriod({
  value: valueProp,
  defaultValue = DEFAULT_VALUE,
  onValueChange,
  presets = dashboardPeriodPresets,
  dataStart,
  dataEnd,
  alignWeekday,
  readOnly,
  disabled,
  size = 'md',
  emphasis,
  timeZone,
  today: todayProp,
  weekStart,
  fiscalYearStart,
  locale,
  children,
  className,
  'aria-label': ariaLabel = 'Dashboard period',
  ...props
}: DashboardPeriodProps) {
  const zone = usePickerZone(timeZone)
  const today = useToday(todayProp, zone)
  // Read against noon of today in UTC, as DateRangePicker does, so both
  // agree on the dates whatever zone the code runs in.
  const options: ComparisonOptions | null = today
    ? {
        now: noonOf(today),
        timeZone: 'UTC',
        weekStart,
        fiscalYearStart,
        dataStart,
        dataEnd,
        alignWeekday
      }
    : null

  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = valueProp ?? uncontrolled
  // The comparison as edited in the open picker; dropped as it opens or closes.
  const [edit, setEdit] = useState<{ compare?: Comparison } | null>(null)
  const compare = edit ? edit.compare : value.compare
  const [lastChoice, setLastChoice] = useState<Comparison>(
    value.compare ?? 'previous-period'
  )

  function emit(next: DashboardPeriodValue) {
    // A picker left open keeps its Apply after the toolbar locks.
    if (readOnly || disabled) return
    if (valueProp === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  const periodOf = (range: DateRangeValue, compareWith?: Comparison) =>
    compareWith ? { range, compare: compareWith } : { range }

  function editCompare(next?: Comparison) {
    if (next) setLastChoice(next)
    setEdit({ compare: next })
  }

  const shown = value.compare
    ? compared(value.range, value.compare, options, locale)
    : null
  const inWords = value.compare
    ? `vs ${CHOICES.find((c) => c.value === choiceOf(value.compare!))!.label.toLowerCase()}`
    : null
  const suffix = value.compare && shown?.dates ? `vs ${shown.dates}` : inWords

  const choices = CHOICES.filter(
    (choice) =>
      choice.value !== 'custom' ||
      (compare && choiceOf(compare) === 'custom') ||
      (value.compare && choiceOf(value.compare) === 'custom')
  )
  const customCompare =
    value.compare && isAbsoluteRange(value.compare) ? value.compare : null

  const compareRow = (range: DateRangeValue | null) => {
    const current = compare ? compared(range, compare, options, locale) : null
    return (
      <div data-slot='dashboard-period-compare' className='grid gap-3'>
        <Switch
          label='Compare'
          checked={!!compare}
          onCheckedChange={(on) => editCompare(on ? lastChoice : undefined)}
        />
        {compare && (
          <div className='grid gap-2'>
            <ToggleGroup<Choice>
              aria-label='Compare with'
              size='sm'
              value={[choiceOf(compare)]}
              onValueChange={(next) => {
                const choice = next[0]
                if (!choice) return
                editCompare(
                  choice === 'custom' ? (customCompare ?? lastChoice) : choice
                )
              }}
              className='w-full *:flex-1'
            >
              {choices.map((choice) => (
                <ToggleGroup.Item key={choice.value} value={choice.value}>
                  {choice.label}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup>
            <p
              data-slot='dashboard-period-compare-dates'
              aria-live='polite'
              className='text-sm text-subtle'
            >
              {current?.note ?? current?.dates}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      role='group'
      aria-label={ariaLabel}
      data-slot='dashboard-period'
      className={cn(
        '@container flex flex-wrap items-center gap-2 *:min-w-0',
        className
      )}
      {...props}
    >
      <ExtendedDateRangePicker
        size={size}
        emphasis={emphasis}
        timeZone={timeZone}
        today={todayProp}
        weekStart={weekStart}
        fiscalYearStart={fiscalYearStart}
        locale={locale}
        readOnly={readOnly}
        disabled={disabled}
        commit='apply'
        clearable={false}
        className='w-full @sm:w-fit'
        aria-label='Period'
        presets={presets}
        value={value.range}
        onOpenChange={() => {
          setEdit(null)
          setLastChoice(value.compare ?? 'previous-period')
        }}
        valueSuffix={suffix}
        valueSuffixShort={inWords}
        extra={compareRow}
        onApply={(range) => {
          const next = periodOf(range ?? value.range, compare)
          if (
            !sameRange(next.range, value.range) ||
            !sameComparison(next.compare, value.compare)
          )
            emit(next)
        }}
      />
      {children}
    </div>
  )
}

DashboardPeriod.displayName = 'DashboardPeriod'
