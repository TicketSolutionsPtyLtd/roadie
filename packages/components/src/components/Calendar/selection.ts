import { addDays, compareDates } from '@oztix/roadie-core/datetime'

/** A range of plain ISO dates. Either end is null while one is being chosen. */
export type CalendarDateRange = { start: string | null; end: string | null }

export type CalendarMode = 'single' | 'multiple' | 'range'

/** A date or null in single mode, a list in multiple mode, a range in range mode. */
export type CalendarSelection =
  string | null | readonly string[] | CalendarDateRange

export type SelectOptions = {
  required?: boolean
  min?: number
  max?: number
}

function ordered(a: string, b: string): [string, string] {
  return compareDates(a, b) <= 0 ? [a, b] : [b, a]
}

/** Whether a range from `start` to `date`, both days counted, fits min and max. */
export function withinLength(
  start: string,
  date: string,
  { min, max }: Pick<SelectOptions, 'min' | 'max'>
): boolean {
  const [first, last] = ordered(start, date)
  const tooShort =
    min !== undefined && compareDates(last, addDays(first, min - 1)) < 0
  const tooLong =
    max !== undefined && compareDates(last, addDays(first, max - 1)) > 0
  return !tooShort && !tooLong
}

export function selectDate(
  mode: CalendarMode,
  current: CalendarSelection,
  date: string,
  options: SelectOptions = {}
): CalendarSelection {
  if (mode === 'single') {
    const same = current === date
    return same && !options.required ? null : date
  }

  if (mode === 'multiple') {
    const dates = current as readonly string[]
    if (!dates.includes(date)) {
      return [...dates, date].sort((a, b) => compareDates(a, b))
    }
    if (options.required && dates.length === 1) return dates
    return dates.filter((selected) => selected !== date)
  }

  const range = current as CalendarDateRange
  const extending = range.start !== null && range.end === null
  if (!extending) return { start: date, end: null }
  // A day the length refuses keeps the start, rather than starting over
  // somewhere the reader didn't mean to.
  if (!withinLength(range.start!, date, options)) {
    return date === range.start ? { start: null, end: null } : current
  }
  const [start, end] = ordered(range.start!, date)
  return { start, end }
}

/** Why a range's length refuses a day, such as "Ranges can be up to 14 days". */
export function lengthRule({
  min,
  max
}: Pick<SelectOptions, 'min' | 'max'>): string {
  const days = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`
  if (min !== undefined && max !== undefined)
    return min === max
      ? `Ranges must be ${days(min)}`
      : `Ranges can be ${min} to ${days(max)}`
  if (max !== undefined) return `Ranges can be up to ${days(max)}`
  return `Ranges must be at least ${days(min ?? 1)}`
}

export function isSelected(
  mode: CalendarMode,
  current: CalendarSelection,
  date: string
): boolean {
  if (mode === 'single') return current === date
  if (mode === 'multiple') return (current as readonly string[]).includes(date)
  const { start, end } = current as CalendarDateRange
  if (start === null) return false
  if (end === null) return start === date
  return compareDates(date, start) >= 0 && compareDates(date, end) <= 0
}

/** The range a started selection would make if it ended on `target`. */
export function previewRange(
  range: CalendarDateRange,
  target: string | null
): { start: string; end: string } | null {
  if (range.start === null || range.end !== null || target === null) return null
  const [start, end] = ordered(range.start, target)
  return { start, end }
}
