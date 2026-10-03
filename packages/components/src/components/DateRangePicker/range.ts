import {
  type DateRangeOptions,
  type DateRangeValue,
  describeDateRange,
  isAbsoluteRange,
  resolveDateRange
} from '@oztix/roadie-core/datetime'

import { type DateTimeParts, joinValue, splitValue } from '../../pickers/value'
import { withinLength } from '../Calendar/selection'

/** A choice in the picker's preset list. */
export type DateRangePreset = {
  /** Kept as given, so a relative choice stays relative when saved. */
  value: DateRangeValue
  /** Defaults to the value in words, such as "Last 30 days". */
  label?: string
  /** Presets sharing a group sit together under its name. */
  group?: string
}

/** Today and the yesterdays before it; recent periods; periods to date. */
export const dateRangePresets: readonly DateRangePreset[] = [
  { value: 'today' },
  { value: 'yesterday' },
  { value: { direction: 'past', amount: 7, unit: 'day' }, group: 'Recent' },
  { value: { direction: 'past', amount: 30, unit: 'day' }, group: 'Recent' },
  { value: { direction: 'past', amount: 90, unit: 'day' }, group: 'Recent' },
  { value: 'last-week', group: 'Recent' },
  { value: 'last-month', group: 'Recent' },
  { value: { period: 'quarter', offset: -1 }, group: 'Recent' },
  { value: { period: 'week', offset: 0, toDate: true }, group: 'To date' },
  { value: { period: 'month', offset: 0, toDate: true }, group: 'To date' },
  { value: { period: 'quarter', offset: 0, toDate: true }, group: 'To date' },
  {
    value: { period: 'year', offset: 0, toDate: true, fiscal: true },
    group: 'To date'
  }
]

/**
 * How relative words are resolved. `options` is null on the server and while
 * hydrating, when today isn't known yet.
 */
export type RangeContext = {
  options: DateRangeOptions | null
  /** The zone date-times are read and written in. */
  zone: string
}

/** One end of the range. `unreadable` marks typed text that names nothing. */
export type RangeEnd = DateTimeParts & { unreadable?: boolean }

export type RangeDraft = {
  /** The value as chosen, until its dates are edited. */
  chosen: DateRangeValue | null
  start: RangeEnd
  end: RangeEnd
}

export type DraftResult =
  | { kind: 'value'; value: DateRangeValue | null }
  | { kind: 'incomplete' }
  | { kind: 'reversed' }
  | { kind: 'too-short' | 'too-long' }

const EMPTY: DateTimeParts = { date: null, time: null }

function canonical(value: DateRangeValue): string {
  if (typeof value === 'string') return value
  const entries = Object.entries(value)
    // `false` reads the same as leaving a flag out.
    .filter(([, field]) => field !== undefined && field !== false)
    .sort(([a], [b]) => (a < b ? -1 : 1))
  return JSON.stringify(entries)
}

export function sameRange(
  a: DateRangeValue | null,
  b: DateRangeValue | null
): boolean {
  if (a === null || b === null) return a === b
  return canonical(a) === canonical(b)
}

/** The value's dates as the calendar and typed fields show them. */
export function draftFrom(
  value: DateRangeValue | null,
  { options, zone }: RangeContext
): RangeDraft {
  const empty = { chosen: value, start: EMPTY, end: EMPTY }
  if (value === null) return empty
  if (isAbsoluteRange(value)) {
    return {
      chosen: value,
      start: splitValue(value.start, zone),
      end: splitValue(value.end, zone)
    }
  }
  if (!options) return empty
  try {
    const resolved = resolveDateRange(value, options)
    if (resolved.kind !== 'dates') return empty
    return {
      chosen: value,
      start: { date: resolved.start, time: null },
      end: { date: resolved.end, time: null }
    }
  } catch {
    return empty
  }
}

/**
 * An end as its value reads back, so a time a daylight saving jump skips
 * shows where it lands.
 */
export function readBack(
  end: RangeEnd,
  granularity: 'day' | 'minute',
  zone: string
): RangeEnd {
  if (granularity === 'day' || end.unreadable || !end.date || !end.time) {
    return end
  }
  const joined = joinValue(end, 'minute', zone)
  return joined ? splitValue(joined, zone) : end
}

function joinEnd(
  parts: DateTimeParts,
  granularity: 'day' | 'minute',
  zone: string
): string | null {
  if (granularity === 'day' || !parts.time) return parts.date
  return joinValue(parts, 'minute', zone)
}

/** What the draft would commit, or why it can't yet. */
export function draftValue(
  draft: RangeDraft,
  granularity: 'day' | 'minute',
  zone: string,
  { min, max }: { min?: number; max?: number } = {}
): DraftResult {
  if (draft.chosen !== null) return { kind: 'value', value: draft.chosen }
  if (draft.start.unreadable || draft.end.unreadable) {
    return { kind: 'incomplete' }
  }
  const start = joinEnd(draft.start, granularity, zone)
  const end = joinEnd(draft.end, granularity, zone)
  if (start === null && end === null) return { kind: 'value', value: null }
  if (start === null || end === null) return { kind: 'incomplete' }
  const value = { start, end }
  try {
    resolveDateRange(value, { now: new Date(0), timeZone: zone })
  } catch {
    return { kind: 'reversed' }
  }
  const first = draft.start.date!
  const last = draft.end.date!
  if (!withinLength(first, last, { min })) return { kind: 'too-short' }
  if (!withinLength(first, last, { max })) return { kind: 'too-long' }
  return { kind: 'value', value }
}

const LABEL_OPTIONS = { now: new Date(0), timeZone: 'UTC' }

export function presetLabel(preset: DateRangePreset, locale?: string): string {
  if (preset.label) return preset.label
  try {
    return describeDateRange(preset.value, { ...LABEL_OPTIONS, locale }).label
  } catch {
    return ''
  }
}

export function groupPresets(presets: readonly DateRangePreset[]) {
  const groups: { group: string | undefined; presets: DateRangePreset[] }[] = []
  for (const preset of presets) {
    const found = groups.find(({ group }) => group === preset.group)
    if (found) found.presets.push(preset)
    else groups.push({ group: preset.group, presets: [preset] })
  }
  return groups.sort(
    (a, b) => Number(a.group !== undefined) - Number(b.group !== undefined)
  )
}

/**
 * The value in words, with the dates a relative range stands for as `detail`.
 * Null when the value can't be read.
 */
export function describeRange(
  value: DateRangeValue,
  { options, zone }: RangeContext,
  locale: string | undefined
): { label: string; detail: string | null } | null {
  try {
    if (isAbsoluteRange(value)) {
      const { detail } = describeDateRange(value, {
        ...LABEL_OPTIONS,
        timeZone: zone,
        locale
      })
      return { label: detail, detail: null }
    }
    if (!options) {
      return {
        label: describeDateRange(value, { ...LABEL_OPTIONS, locale }).label,
        detail: null
      }
    }
    const { label, detail } = describeDateRange(value, { ...options, locale })
    // Moments are read against today's noon, so only whole dates are shown.
    const datesOnly = resolveDateRange(value, options).kind === 'dates'
    return { label, detail: datesOnly && detail !== label ? detail : null }
  } catch {
    return null
  }
}
