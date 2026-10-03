'use client'

import type { ComponentProps } from 'react'

import type { DateRangeValue } from '@oztix/roadie-core/datetime'

import type { HourCycle } from '../../pickers/readTime'
import type { CalendarMatchers } from '../Calendar/matchers'
import { ExtendedDateRangePicker } from './ExtendedDateRangePicker'
import type { DateRangePreset } from './range'

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
  /**
   * With `commit='apply'`, keeps Apply off while both dates are empty.
   * Inherits from `Field` when omitted.
   */
  required?: boolean
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** @default 'normal' */
  emphasis?: 'normal' | 'subtle' | 'subtler'
  /** Shown while no range is chosen. @default 'Choose dates' */
  placeholder?: string
  /**
   * Months side by side. Defaults to two on wide screens and one on narrow.
   */
  numberOfMonths?: number
  /** The fewest days the range can span, both ends counted. */
  min?: number
  /** The most days the range can span, both ends counted. */
  max?: number
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

/** A button showing a date range, opening presets, typed dates and a calendar. */
export function DateRangePicker(props: DateRangePickerProps) {
  return <ExtendedDateRangePicker {...props} />
}

DateRangePicker.displayName = 'DateRangePicker'
