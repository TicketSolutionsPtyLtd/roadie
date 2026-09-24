import { type ValueFormat, formatValue } from '@oztix/roadie-core/dataviz'

import { spokenX } from './time'

export function describeValue(
  value: number | null,
  format: ValueFormat | undefined,
  noun: string
) {
  if (value === null || !Number.isFinite(value)) return 'no data'
  return `${formatValue(value, format ?? 'number')} ${noun}`
}

export function spokenPoint(
  x: number | string,
  isTime: boolean,
  hasTime: boolean
) {
  return isTime && typeof x === 'number' ? spokenX(x, hasTime) : String(x)
}

export function trendSentence({
  noun,
  first,
  last,
  from,
  to,
  format
}: {
  noun: string
  first: number
  last: number
  from: string
  to: string
  format?: ValueFormat
}) {
  const verb = last > first ? 'rose' : last < first ? 'fell' : 'held'
  const value = (v: number) => formatValue(v, format ?? 'number')
  return verb === 'held'
    ? `${noun} held at ${value(last)} between ${from} and ${to}`
    : `${noun} ${verb} from ${value(first)} to ${value(last)} between ${from} and ${to}`
}
