import {
  formatLong,
  formatTimeOfDay,
  separators,
  viewerTimeZone
} from '@oztix/roadie-core/datetime'

import type { CartSeat } from './types'

export type CurrencyOptions = {
  locale: string
  currency: string
}
export type DateOptions = {
  locale: string
}

function collapseSeatRuns(labels: string[]): string {
  const allInts = labels.every((s) => /^\d+$/.test(s))
  if (!allInts) return labels.join(', ')
  const sorted = [...labels.map(Number)].sort((a, b) => a - b)
  const runs: string[] = []
  let start = sorted[0]!
  let prev = start
  const flush = () =>
    // A hyphen, not the word 'to' the date ranges use: '1 to 4' reads as prose
    // where '1-4' reads as a compressed run, which is what a seat list is. The
    // brand guide already spells number ranges this way.
    runs.push(start === prev ? `${start}` : `${start}-${prev}`)
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!
    if (cur === prev + 1) {
      prev = cur
    } else {
      flush()
      start = prev = cur
    }
  }
  flush()
  return runs.join(', ')
}

export function formatSeatRange(seats: CartSeat[] | undefined): string | null {
  if (!seats || seats.length === 0) return null
  // De-dupe identical seats so a merged reservation never renders twice.
  const seen = new Set<string>()
  const groups = new Map<
    string,
    { section?: string; row?: string; labels: string[] }
  >()
  for (const s of seats) {
    const id = `${s.section ?? ''}|${s.row ?? ''}|${s.seat}`
    if (seen.has(id)) continue
    seen.add(id)
    const key = `${s.section ?? ''}|${s.row ?? ''}`
    const group = groups.get(key) ?? {
      section: s.section,
      row: s.row,
      labels: []
    }
    group.labels.push(s.seat)
    groups.set(key, group)
  }
  const parts = [...groups.values()].map((g) => {
    const seatList = `${g.row ?? ''}${collapseSeatRuns(g.labels)}`
    return g.section ? `${g.section} ${seatList}` : seatList
  })
  return parts.join(' · ')
}

export function formatCurrency(amount: number, opts: CurrencyOptions): string {
  return amount.toLocaleString(opts.locale, {
    style: 'currency',
    currency: opts.currency
  })
}

export function currencyPrefix(locale: string, currency: string): string {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).formatToParts(0)
  let prefix = ''
  for (const part of parts) {
    if (part.type === 'integer' || part.type === 'decimal') break
    if (part.type === 'currency' || part.type === 'literal')
      prefix += part.value
  }
  return prefix
}

export type TimeOptions = {
  timeZone?: string
}

export function formatTime(date: Date, opts: TimeOptions = {}): string {
  return (
    formatTimeOfDay(date, {
      timeZone: opts.timeZone ?? viewerTimeZone(),
      timeStyle: 'short'
    }) ?? ''
  )
}

function parseDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const y = Number(dateKey.slice(0, 4))
  const m = Number(dateKey.slice(5, 7))
  const d = Number(dateKey.slice(8, 10))
  const date = new Date(y, m - 1, d) // local; no UTC shift
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null
  }
  return date
}

export function formatDayHeader(dateKey: string, opts: DateOptions): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return (
    formatLong(date, {
      locale: opts.locale,
      timeZone: viewerTimeZone(),
      showYear: true
    }) ?? dateKey
  )
}

export function formatDayShort(dateKey: string, opts: DateOptions): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return (
    formatLong(date, {
      locale: opts.locale,
      timeZone: viewerTimeZone(),
      showYear: false
    }) ?? dateKey
  )
}

type Schedulable = {
  eventStartAtUtc: string
  eventEndAtUtc?: string
  eventDateKey: string
  eventEndDateKey?: string
  eventTimeZone?: string
}

export function formatEventSchedule(
  event: Schedulable,
  opts: DateOptions
): string | null {
  const timeOpts: TimeOptions = { timeZone: event.eventTimeZone }
  const start = new Date(event.eventStartAtUtc)
  if (Number.isNaN(start.getTime())) return null
  const startTime = formatTime(start, timeOpts)

  const end = event.eventEndAtUtc ? new Date(event.eventEndAtUtc) : null
  if (!end || Number.isNaN(end.getTime())) return startTime
  const endTime = formatTime(end, timeOpts)
  // A half-built range reads as a stray separator, which is worse than nothing.
  if (!startTime || !endTime) return ''

  const multiDay =
    !!event.eventEndDateKey && event.eventEndDateKey !== event.eventDateKey
  if (multiDay) {
    return `${startTime} ${separators.range} ${formatDayShort(event.eventEndDateKey!, opts)}, ${endTime}`
  }
  return `${startTime} ${separators.range} ${endTime}`
}
