import { type ValueFormat, formatValue } from '@oztix/roadie-core/dataviz'

import { spokenX } from './time'
import { fullFormat } from './values'

export function describeValue(
  value: number | null,
  format: ValueFormat | undefined,
  noun: string
) {
  if (value === null || !Number.isFinite(value)) return 'no data'
  return `${formatValue(value, fullFormat(format))} ${noun}`
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
  const value = (v: number) => formatValue(v, fullFormat(format))
  return verb === 'held'
    ? `${noun} held at ${value(last)} between ${from} and ${to}`
    : `${noun} ${verb} from ${value(first)} to ${value(last)} between ${from} and ${to}`
}

const SAME_BOTH_WAYS = new Set(['series', 'species', 'news'])
const IRREGULAR: Record<string, string> = {
  bus: 'buses',
  bonus: 'bonuses',
  campus: 'campuses',
  census: 'censuses',
  status: 'statuses',
  virus: 'viruses',
  person: 'people',
  child: 'children'
}
const IRREGULAR_SINGULAR = Object.fromEntries(
  Object.entries(IRREGULAR).map(([one, many]) => [many, one])
)

export function singular(noun: string) {
  if (SAME_BOTH_WAYS.has(noun) || noun in IRREGULAR) return noun
  const irregular = IRREGULAR_SINGULAR[noun]
  if (irregular) return irregular
  if (/[^aeiou]ies$/.test(noun)) return `${noun.slice(0, -3)}y`
  if (/(ss|us|is)$/.test(noun)) return noun
  if (/(x|z|ch|sh|ss)es$/.test(noun)) return noun.slice(0, -2)
  return noun.endsWith('s') ? noun.slice(0, -1) : noun
}

export function plural(noun: string) {
  const one = singular(noun)
  if (SAME_BOTH_WAYS.has(one)) return one
  const irregular = IRREGULAR[one]
  if (irregular) return irregular
  if (/[^aeiou]y$/.test(one)) return `${one.slice(0, -1)}ies`
  if (/(s|x|z|ch|sh)$/.test(one)) return `${one}es`
  return `${one}s`
}

/** The noun that goes with a count: "1 ticket", "2 tickets". */
export const nounFor = (count: number, noun: string) =>
  count === 1 ? singular(noun) : plural(noun)
