'use client'

import { type ComponentProps, type ReactNode, useState } from 'react'

import { LockSimpleIcon } from '@phosphor-icons/react/ssr'

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
import { DateRangePicker } from '../DateRangePicker'
import type { DateRangePreset } from '../DateRangePicker/range'
import { Select } from '../Select'
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
   * Called when the period is applied or the comparison is chosen. Each
   * change refetches the dashboard, so the period waits for Apply.
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
  /** The app's own controls, such as a benchmark, placed after the comparison. */
  children?: ReactNode
}

type Choice = 'previous-period' | 'previous-year' | 'custom' | 'none'

const CHOICES: { value: Choice; label: string; shown: string }[] = [
  {
    value: 'previous-period',
    label: 'Previous period',
    shown: 'vs previous period'
  },
  { value: 'previous-year', label: 'Previous year', shown: 'vs previous year' },
  { value: 'custom', label: 'Custom dates', shown: 'vs custom dates' },
  { value: 'none', label: 'No comparison', shown: 'No comparison' }
]

const DEFAULT_VALUE: DashboardPeriodValue = {
  range: { direction: 'past', amount: 30, unit: 'day' },
  compare: 'previous-period'
}

function choiceOf(compare: Comparison | undefined): Choice {
  if (!compare) return 'none'
  return isAbsoluteRange(compare) ? 'custom' : compare
}

const customOf = (compare: Comparison | undefined) =>
  compare && isAbsoluteRange(compare) ? compare : null

function noonOf(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

/** The dates a comparison covers, or null when they can't be known yet. */
function comparedDates(
  range: DateRangeValue,
  compare: 'previous-period' | 'previous-year',
  options: ComparisonOptions | null
): { start: string; end: string } | null {
  if (!options) return null
  try {
    const resolved = resolveComparison(range, compare, options).range
    return resolved?.kind === 'dates'
      ? { start: resolved.start, end: resolved.end }
      : null
  } catch {
    return null
  }
}

/** A dashboard's period picker and the comparison beside it. */
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
  const [selectOpen, setSelectOpen] = useState(false)
  if (readOnly && selectOpen) setSelectOpen(false)

  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = valueProp ?? uncontrolled
  const choice = choiceOf(value.compare)
  const custom = customOf(value.compare)

  function emit(next: DashboardPeriodValue) {
    // A picker left open keeps its Apply after the toolbar locks.
    if (readOnly || disabled) return
    if (valueProp === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  const periodOf = (range: DateRangeValue, compare?: Comparison) =>
    compare ? { range, compare } : { range }
  const withCompare = (compare?: Comparison) => periodOf(value.range, compare)

  function choose(next: Choice) {
    if (next === choice) return
    if (next === 'none') return emit(withCompare())
    if (next !== 'custom') return emit(withCompare(next))
    const seed =
      comparedDates(value.range, 'previous-period', options) ??
      (today ? { start: today, end: today } : null)
    if (seed) emit(withCompare(seed))
  }

  const detail = (compare: 'previous-period' | 'previous-year') => {
    const covered = comparedDates(value.range, compare, options)
    return covered && options
      ? describeDateRange(covered, { ...options, locale }).detail
      : null
  }

  const pickerProps = {
    size,
    timeZone,
    today: todayProp,
    weekStart,
    fiscalYearStart,
    locale,
    readOnly,
    disabled,
    commit: 'apply' as const,
    required: true,
    className: 'w-full @sm:w-fit'
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
      <DateRangePicker
        {...pickerProps}
        aria-label='Period'
        presets={presets}
        value={value.range}
        onValueChange={(range) => {
          if (range) emit(periodOf(range, value.compare))
        }}
      />
      <Select<Choice>
        value={choice}
        onValueChange={(next) => {
          if (next) choose(next)
        }}
        readOnly={readOnly}
        // Read-only stays shut, like the period beside it.
        open={selectOpen && !readOnly}
        onOpenChange={setSelectOpen}
        disabled={disabled}
      >
        <Select.Trigger
          size={size}
          aria-label='Compare with'
          aria-readonly={readOnly || undefined}
          className='w-full gap-2 @sm:w-fit'
        >
          <Select.Value>
            {(shown: Choice) =>
              CHOICES.find((option) => option.value === shown)?.shown
            }
          </Select.Value>
          {readOnly ? (
            <LockSimpleIcon
              weight='bold'
              aria-hidden='true'
              className='size-4 shrink-0 text-subtle'
            />
          ) : (
            <Select.Icon />
          )}
        </Select.Trigger>
        <Select.Content>
          {CHOICES.map((option) => {
            const dates =
              option.value === 'previous-period' ||
              option.value === 'previous-year'
                ? detail(option.value)
                : null
            return (
              <Select.Item
                key={option.value}
                value={option.value}
                aria-label={dates ? `${option.label}, ${dates}` : undefined}
              >
                <span className='grid min-w-0'>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  {dates && (
                    <span className='text-sm text-subtle'>{dates}</span>
                  )}
                </span>
                <Select.ItemIndicator />
              </Select.Item>
            )
          })}
        </Select.Content>
      </Select>
      {custom && (
        <DateRangePicker
          {...pickerProps}
          aria-label='Comparison dates'
          presets={[]}
          value={custom}
          onValueChange={(compare) => {
            if (compare && isAbsoluteRange(compare)) emit(withCompare(compare))
          }}
        />
      )}
      {children}
    </div>
  )
}

DashboardPeriod.displayName = 'DashboardPeriod'
