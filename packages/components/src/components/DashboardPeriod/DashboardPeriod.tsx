'use client'

import { type ComponentProps, type ReactNode, useEffect, useState } from 'react'

import {
  type AbsoluteRange,
  type Comparison,
  type ComparisonOptions,
  type DateRangeValue,
  describeDateRange,
  isAbsoluteRange,
  isBuiltInComparison,
  resolveComparison
} from '@oztix/roadie-core/datetime'
import { cn } from '@oztix/roadie-core/utils'

import { usePickerZone } from '../../pickers/PickerShell'
import { isDev } from '../../utils/isDev'
import { useToday } from '../Calendar/today'
import { DateRangePicker } from '../DateRangePicker'
import { ExtendedDateRangePicker } from '../DateRangePicker/ExtendedDateRangePicker'
import { type DateRangePreset, sameRange } from '../DateRangePicker/range'
import { Switch } from '../Switch'
import { ToggleGroup } from '../ToggleGroup'
import { dashboardPeriodPresets } from './presets'

/**
 * A dashboard's period and what it compares with. No `compare`, no
 * comparison. `App` is the app's own comparisons, from `compareOptions`.
 */
export type DashboardPeriodValue<App extends string = never> = {
  range: DateRangeValue
  compare?: Comparison<App>
}

/** One of the app's own comparisons, which `compare` carries as `value`. */
export type DashboardPeriodCompareOption<App extends string = string> = {
  value: App
  label: string
  /** Shown where Roadie's comparisons show their dates. */
  description?: string
}

export type DashboardPeriodProps<App extends string = never> = Omit<
  ComponentProps<'div'>,
  'defaultValue' | 'onChange'
> & {
  /** The period and its comparison. Pair with `onValueChange`. */
  value?: DashboardPeriodValue<App>
  /**
   * The period to start from when uncontrolled. Defaults to the past 30
   * days, compared with the first of `compareOptions` other than `'custom'`.
   */
  defaultValue?: DashboardPeriodValue<App>
  /**
   * Called when Apply is pressed with the period and its comparison. Each
   * change refetches the dashboard, so both wait for Apply.
   */
  onValueChange?: (value: DashboardPeriodValue<App>) => void
  /**
   * The period's presets, as on `DateRangePicker`.
   *
   * @default dashboardPeriodPresets
   */
  presets?: readonly DateRangePreset[]
  /**
   * The Compare choices, in order. `'previous-period'` and `'previous-year'`
   * are Roadie's; `'custom'` picks dates; `{ value, label, description? }` is
   * the app's own, passed through as `compare: value` with no dates, and
   * read on the button as "vs " and the label with its first letter
   * lowercased. `'none'` adds the Compare switch; without it nothing turns
   * the comparison off. A comparison the value holds that the list leaves
   * out still shows. Uncontrolled, the first choice other than `'custom'`
   * starts on. Hoist the list with `as const` so the app's values are kept.
   *
   * @default ['none', 'previous-period', 'previous-year']
   */
  compareOptions?: readonly (
    | 'none'
    | 'previous-period'
    | 'previous-year'
    | 'custom'
    | DashboardPeriodCompareOption<App>
  )[]
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
  /** The app's own controls, placed after the period. */
  children?: ReactNode
}

type Choice = { value: string; label: string; description?: string }

const BUILT_IN = {
  'previous-period': 'Previous period',
  'previous-year': 'Previous year',
  custom: 'Custom dates'
} as const

const DEFAULT_COMPARE_OPTIONS = [
  'none',
  'previous-period',
  'previous-year'
] as const

const HISTORY = {
  partial: 'Not enough history',
  unavailable: 'Nothing to compare'
} as const

const DEFAULT_RANGE: DateRangeValue = {
  direction: 'past',
  amount: 30,
  unit: 'day'
}

const warned = new Set<string>()

const RESERVED: readonly string[] = ['none', 'custom', ...Object.keys(BUILT_IN)]

function choiceOf(compare: Comparison<string>): string {
  return typeof compare === 'object' ? 'custom' : compare
}

function noonOf(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

const sameComparison = (a?: Comparison<string>, b?: Comparison<string>) =>
  typeof a !== 'object' || typeof b !== 'object' ? a === b : sameRange(a, b)

// "Similar venues" reads "vs similar venues", but "GA venues" keeps its caps.
const inSentence = (label: string, locale: string | undefined) =>
  label.replace(/^\p{Lu}(?=\p{Ll})/u, (first) =>
    first.toLocaleLowerCase(locale)
  )

/** The dates a comparison covers, or why there are none to show. */
function compared(
  range: DateRangeValue | null,
  compare: Comparison<string>,
  options: ComparisonOptions | null,
  locale: string | undefined
): {
  dates: string | null
  note: string | null
  covered: AbsoluteRange | null
} {
  const none = { dates: null, note: null, covered: null }
  if (!options || !range || !isBuiltInComparison(compare)) return none
  try {
    const { status, range: covered } = resolveComparison(
      range,
      compare,
      options
    )
    const dates =
      covered?.kind === 'dates'
        ? { start: covered.start, end: covered.end }
        : null
    return {
      dates: dates && describeDateRange(dates, { ...options, locale }).detail,
      note: status === 'available' ? null : HISTORY[status],
      covered: dates
    }
  } catch {
    return none
  }
}

/** A dashboard's period, with what it compares with, in one picker. */
export function DashboardPeriod<App extends string = never>({
  value: valueProp,
  defaultValue,
  onValueChange,
  presets = dashboardPeriodPresets,
  compareOptions = DEFAULT_COMPARE_OPTIONS,
  dataStart,
  dataEnd,
  alignWeekday,
  readOnly,
  disabled,
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
}: DashboardPeriodProps<App>) {
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

  const problems: string[] = []
  const choices: Choice[] = []
  for (const option of compareOptions) {
    if (option === 'none') continue
    const choice =
      typeof option === 'string'
        ? { value: option, label: BUILT_IN[option] }
        : option
    if (typeof option === 'object' && RESERVED.includes(option.value))
      problems.push(
        `"${option.value}" is one of Roadie's own compare options, so the app's option "${option.label}" is left out. Give it a value of its own.`
      )
    else if (choices.some((listed) => listed.value === choice.value)) {
      if (typeof option === 'object')
        problems.push(`"${option.value}" is listed twice in compareOptions.`)
    } else choices.push(choice)
  }
  // Uncontrolled, it starts with the first comparison that needs no dates.
  const firstChoice = choices.find((choice) => choice.value !== 'custom')
  const [uncontrolled, setUncontrolled] = useState<DashboardPeriodValue<App>>(
    () =>
      defaultValue ??
      (firstChoice
        ? {
            range: DEFAULT_RANGE,
            compare: firstChoice.value as Comparison<App>
          }
        : { range: DEFAULT_RANGE })
  )
  const value = valueProp ?? uncontrolled
  // The comparison as edited in the open picker; dropped as it opens or closes.
  const [edit, setEdit] = useState<{ compare?: Comparison<App> } | null>(null)
  const customOf = (comparison?: Comparison<App>) =>
    comparison && typeof comparison === 'object' ? comparison : null
  // The value's comparison as last seen; what the switch turns back on; and
  // the custom dates Custom returns to. One state, so they change together.
  const remembered = (comparison?: Comparison<App>) => ({
    seen: comparison,
    lastChoice: comparison ?? null,
    lastCustom: customOf(comparison)
  })
  const [memory, setMemory] = useState(() => remembered(value.compare))
  const { lastChoice, lastCustom } = memory
  // A comparison from outside replaces an open edit, as the range does.
  if (!sameComparison(memory.seen, value.compare)) {
    setMemory(remembered(value.compare))
    setEdit(null)
  }
  const compare = edit ? edit.compare : value.compare

  const switchShown = compareOptions.includes('none')
  const customEditable = compareOptions.includes('custom')
  // A comparison the list leaves out still shows, so the choices never hide
  // what the value holds.
  for (const held of [value.compare, compare]) {
    if (!held) continue
    const choice = choiceOf(held)
    if (choices.some((listed) => listed.value === choice)) continue
    if (isBuiltInComparison(held))
      choices.push({
        value: choice,
        label: BUILT_IN[choice as keyof typeof BUILT_IN]
      })
    else {
      problems.push(
        `compare is "${choice}", which compareOptions doesn't list, so it shows by its value. Add { value: '${choice}', label } to compareOptions.`
      )
      choices.push({ value: choice, label: choice })
    }
  }
  const warnings = problems.join('\n')
  useEffect(() => {
    if (!warnings || !isDev()) return
    // Once each, so StrictMode's second mount doesn't repeat them.
    for (const problem of warnings.split('\n')) {
      if (warned.has(problem)) continue
      warned.add(problem)
      console.warn(`[Roadie] DashboardPeriod: ${problem}`)
    }
  }, [warnings])
  const appChoice = (comparison: Comparison<App>) =>
    isBuiltInComparison(comparison)
      ? undefined
      : choices.find((choice) => choice.value === comparison)

  function emit(next: DashboardPeriodValue<App>) {
    // A picker left open keeps its Apply after the toolbar locks.
    if (readOnly || disabled) return
    if (valueProp === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  const periodOf = (range: DateRangeValue, compareWith?: Comparison<App>) =>
    compareWith ? { range, compare: compareWith } : { range }

  function editCompare(next?: Comparison<App>) {
    if (next)
      setMemory({
        ...memory,
        lastChoice: next,
        lastCustom: customOf(next) ?? memory.lastCustom
      })
    setEdit({ compare: next })
  }

  /** The comparison a choice stands for: custom dates start from the previous period. */
  function comparisonFor(
    choice: string,
    range: DateRangeValue | null
  ): Comparison<App> | undefined {
    if (choice !== 'custom') return choice as Comparison<App>
    return (
      lastCustom ??
      compared(range, 'previous-period', options, locale).covered ??
      undefined
    )
  }

  const shown = value.compare
    ? compared(value.range, value.compare, options, locale)
    : null
  const named = value.compare
    ? isBuiltInComparison(value.compare)
      ? (shown?.dates ??
        BUILT_IN[choiceOf(value.compare) as keyof typeof BUILT_IN])
      : appChoice(value.compare)?.label
    : undefined
  const suffix = named ? `vs ${inSentence(named, locale)}` : null

  const compareRow = (range: DateRangeValue | null) => {
    const current = compare ? compared(range, compare, options, locale) : null
    const choice = compare ? choiceOf(compare) : null
    const customDates =
      customEditable && choice === 'custom' ? customOf(compare) : null
    const line = compare
      ? isBuiltInComparison(compare)
        ? (current?.note ?? (customDates ? null : current?.dates))
        : appChoice(compare)?.description
      : null
    const groupShown = !!compare || !switchShown
    return (
      <div data-slot='dashboard-period-compare' className='grid gap-3'>
        {switchShown && (
          <Switch
            label='Compare'
            checked={!!compare}
            disabled={
              !compare &&
              !choices.some((option) => comparisonFor(option.value, range))
            }
            onCheckedChange={(on) =>
              editCompare(
                on
                  ? (lastChoice ??
                      choices
                        .map((option) => comparisonFor(option.value, range))
                        .find(Boolean))
                  : undefined
              )
            }
          />
        )}
        {groupShown && (
          <div className='grid gap-2'>
            <ToggleGroup
              aria-label='Compare with'
              size='sm'
              value={choice ? [choice] : []}
              onValueChange={(next) => {
                const picked = next[0]
                const comparison = picked && comparisonFor(picked, range)
                if (comparison) editCompare(comparison)
              }}
              // Wraps when the choices outgrow the row; the radius is a
              // pill's on one row.
              className='flex w-full flex-wrap rounded-2xl *:flex-1'
            >
              {choices.map((option) => (
                <ToggleGroup.Item
                  key={option.value}
                  value={option.value}
                  // Custom dates start from the previous period; with none to
                  // start from there are no dates to pick.
                  disabled={!comparisonFor(option.value, range)}
                >
                  {option.label}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup>
            {customDates && (
              <DateRangePicker
                aria-label='Comparison dates'
                size='sm'
                presets={[]}
                value={customDates}
                onValueChange={(next) => {
                  if (next && isAbsoluteRange(next)) editCompare(next)
                }}
                disabled={readOnly || disabled}
                timeZone={timeZone}
                today={todayProp}
                weekStart={weekStart}
                fiscalYearStart={fiscalYearStart}
                locale={locale}
              />
            )}
            <p
              data-slot='dashboard-period-compare-dates'
              aria-live='polite'
              className='text-sm text-subtle'
            >
              {line}
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
        size='lg'
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
          setMemory(remembered(value.compare))
        }}
        valueSuffix={suffix}
        extra={choices.length > 0 ? compareRow : undefined}
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
