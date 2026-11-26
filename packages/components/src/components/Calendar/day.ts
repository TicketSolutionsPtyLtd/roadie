import { compareDates } from '@oztix/roadie-core/datetime'

import { type CalendarMatchers, matchesDate } from '../../pickers/matchers'
import { between, lastDayOf, monthOf } from './months'
import {
  type CalendarDateRange,
  type CalendarMode,
  type CalendarSelection,
  isSelected,
  previewRange,
  withinLength
} from './selection'

export type DayModelOptions = {
  mode: CalendarMode
  selection: CalendarSelection
  min?: number
  max?: number
  disabled?: boolean | CalendarMatchers
  /** The first and last days navigation reaches. */
  minDate: string | null
  maxDate: string | null
  today: string | null
  /** The day a started range would end on, such as the one under the pointer. */
  previewTarget: string | null
  previewRange?: { start: string; end: string } | null
  showOutsideDays: boolean
  tiles: boolean
}

type DayLook = 'plain' | 'filled' | 'chosen' | 'middle' | 'middle-tile'

/** What each day shows: chosen, in a range, previewed, disabled, or today. */
export function dayModel(options: DayModelOptions) {
  const { mode, selection, min, max, disabled, minDate, maxDate } = options
  const { today, previewTarget, showOutsideDays, tiles } = options
  // Either way round, as a `{ start, end }` matcher is.
  const previewDays =
    options.previewRange &&
    (compareDates(options.previewRange.start, options.previewRange.end) <= 0
      ? options.previewRange
      : { start: options.previewRange.end, end: options.previewRange.start })
  const range = mode === 'range' ? (selection as CalendarDateRange) : null
  const extending = !!range?.start && !range.end
  const isOutOfRange = (date: string) =>
    extending &&
    date !== range!.start &&
    !withinLength(range!.start!, date, { min, max })
  const preview =
    range && previewTarget && !isOutOfRange(previewTarget)
      ? previewRange(range, previewTarget)
      : null
  const span =
    range?.start && range.end
      ? { start: range.start, end: range.end }
      : (preview ??
        (extending ? { start: range!.start!, end: range!.start! } : null))
  const disabledMatchers = typeof disabled === 'boolean' ? undefined : disabled
  const isDisabled = (date: string) =>
    disabled === true ||
    (minDate !== null && compareDates(date, minDate) < 0) ||
    (maxDate !== null && compareDates(date, maxDate) > 0) ||
    matchesDate(date, disabledMatchers)

  /** Null for a day of another month left as an empty cell. */
  function day(date: string, month: string, column: number) {
    const outside = monthOf(date) !== month
    if (outside && !showOutsideDays) return null
    const selected = isSelected(mode, selection, date)
    const inSpan = !!span && between(date, span.start, span.end)
    const rangeStart = inSpan && date === span!.start
    const rangeEnd = inSpan && date === span!.end
    const rangeMiddle = inSpan && !rangeStart && !rangeEnd
    const firstVisible = column === 0 || (!showOutsideDays && date === month)
    const lastVisible =
      column === 6 || (!showOutsideDays && date === lastDayOf(month))
    const look: DayLook =
      rangeStart || rangeEnd || (mode !== 'range' && selected)
        ? 'chosen'
        : rangeMiddle
          ? tiles
            ? 'middle-tile'
            : 'middle'
          : 'plain'
    const inPreview =
      !!previewDays && between(date, previewDays.start, previewDays.end)
    // The chosen span wins where they overlap.
    const previewed = inPreview && !inSpan
    const previewSpans = !!previewDays && previewDays.start !== previewDays.end
    // One band, ends included, running on beneath the chosen span's ends so
    // the span draws over it; a single day is a circle, as a chosen one is.
    const previewBand =
      inPreview && previewSpans && !tiles && !rangeMiddle
        ? {
            roundStart: firstVisible || date === previewDays!.start,
            roundEnd: lastVisible || date === previewDays!.end
          }
        : null
    const previewDay = previewed && (!previewSpans || tiles)
    return {
      outside,
      selected,
      rangeStart,
      rangeMiddle,
      rangeEnd,
      // In the range a started selection would make.
      previewing: !!preview && inSpan,
      // In the `previewRange` prop, outside the chosen span.
      previewed,
      disabled: isDisabled(date),
      outOfRange: isOutOfRange(date),
      today: date === today,
      firstVisible,
      lastVisible,
      // Before content under the day's number, which fills a plain day too.
      look: look === 'plain' && previewDay ? ('filled' as const) : look,
      band: rangeMiddle && !tiles,
      // Half a band from a range end toward the rest of the range.
      halfBand:
        !tiles &&
        !!span &&
        span.start !== span.end &&
        ((rangeStart && !lastVisible) || (rangeEnd && !firstVisible)),
      previewBand
    }
  }

  return { extending, isDisabled, isOutOfRange, day }
}
