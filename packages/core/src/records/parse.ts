import { describeDateRange } from '../datetime/describe'
import {
  type DatePhraseValue,
  isDatePhraseCompletion,
  parseDatePhrase
} from '../datetime/parse'
import type { DateRangeValue } from '../datetime/ranges'
import { describeRecordFilter } from './describe'
import { encodeFilter } from './encoding'
import { isFilterable, momentOf, recordFieldOptions } from './fields'
import type { RecordField, RecordFilter, RecordQueryOptions } from './types'

type SuggestionBase = {
  /** Stable for the same text, fields and day. */
  id: string
  label: string
  /** The dates a relative phrase stands for, so the absolute stays reachable. */
  description?: string
  /** Higher is better, from 0 to 1; comparable across entities' fields. */
  score: number
  /** The typed text this suggestion leaves unread, to keep in the field. */
  remainder: string
  /** The `entity` option, when given. */
  entity?: string
}

/**
 * A reading of typed text. `filter` adds a chip; `field` starts choosing a
 * field's values. Shaped to pass straight to `QueryField`'s `suggest`.
 */
export type RecordSuggestion =
  | (SuggestionBase & {
      kind: 'filter'
      value: RecordFilter
      /** The text is an identifier, such as an order number: Enter takes it. */
      exact?: boolean
    })
  | (SuggestionBase & { kind: 'field'; value: { field: string } })

export type ParseQueryOptions = RecordQueryOptions & {
  /**
   * One entity's fields. To search several entities, call once per entity
   * with its `entity` and merge the results by `score`.
   */
  fields: readonly RecordField[]
  /** Tags each suggestion and prefixes its id, so entities can merge. */
  entity?: string
  /** Defaults to 10. */
  limit?: number
  locale?: string
}

type Candidate = RecordSuggestion & { span: [number, number]; order: number }

const MAX_WORDS = 8
const MAX_SPAN = 4
const FIELD_WEIGHT = 0.9
const DATE_FIELD_DECAY = 0.95
// A dollar sign and thousands commas only where they belong, so "1,2" reads nothing.
const NUMBER = '(-?\\$?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)'
const amount = (text: string) => Number(text.replace(/[$,]/g, ''))
const NUMBER_RANGE = new RegExp(`^${NUMBER}(?:-|\\.\\.|to)${NUMBER}$`)
const NUMBER_COMPARE = new RegExp(`^(>|<|=|!=)?${NUMBER}$`)
const TRUE_WORDS = new Set(['yes', 'true', 'y'])
const FALSE_WORDS = new Set(['no', 'false', 'n'])

/** How well typed text names a candidate, from 0 to 1. */
function quality(candidate: string, text: string): number {
  const name = candidate.toLowerCase()
  if (name === text) return 1
  if (name.startsWith(text)) return 0.8
  if (name.split(/[\s_-]+/).some((word) => word.startsWith(text))) return 0.7
  if (text.length >= 3 && name.includes(text)) return 0.5
  return 0
}

function bestQuality(candidates: readonly string[], text: string): number {
  return Math.max(0, ...candidates.map((c) => quality(c, text)))
}

function isLiteral(match: RegExp, text: string): boolean {
  match.lastIndex = 0
  const result = match.test(text)
  match.lastIndex = 0
  return result
}

/** The range a phrase stands for, or null for a single date or a time. */
function phraseRange(value: DatePhraseValue): DateRangeValue | null {
  if (typeof value === 'string') return value
  return 'on' in value ||
    'before' in value ||
    'after' in value ||
    'time' in value
    ? null
    : value
}

function dateFilter(
  field: RecordField,
  value: DatePhraseValue
): RecordFilter | null {
  const range = phraseRange(value)
  if (range === null) {
    if (typeof value === 'string') return null
    if ('on' in value)
      return { field: field.key, operator: 'on', value: value.on }
    if ('before' in value) {
      return { field: field.key, operator: 'before', value: value.before }
    }
    if ('after' in value) {
      return { field: field.key, operator: 'after', value: value.after }
    }
    return null
  }
  if (typeof range === 'object' && 'start' in range) {
    return {
      field: field.key,
      operator: 'between',
      value: [range.start, range.end]
    }
  }
  if (
    momentOf(field) === 'date' &&
    typeof range === 'object' &&
    'unit' in range &&
    range.unit === 'hour'
  ) {
    return null
  }
  return { field: field.key, operator: 'within', value: range }
}

function numberFilter(field: RecordField, text: string) {
  const range = NUMBER_RANGE.exec(text)
  if (range) {
    const value: [number, number] = [amount(range[1]!), amount(range[2]!)]
    return value.every(Number.isFinite) && value[0] <= value[1]
      ? {
          filter: { field: field.key, operator: 'between', value } as const,
          label: `${field.label} is ${value[0]} to ${value[1]}`
        }
      : null
  }
  const compare = NUMBER_COMPARE.exec(text)
  if (!compare) return null
  const value = amount(compare[2]!)
  if (!Number.isFinite(value)) return null
  const [operator, words] =
    (
      {
        '>': ['gt', 'more than '],
        '<': ['lt', 'less than '],
        '!=': ['neq', 'not ']
      } as const
    )[compare[1] as '>' | '<' | '!='] ?? (['eq', ''] as const)
  return {
    filter: { field: field.key, operator, value } as RecordFilter,
    label: `${field.label} is ${words}${value}`
  }
}

type Reading = {
  filter: RecordFilter
  label: string
  quality: number
  description?: string
  exact?: boolean
  /** False for a date phrase completed from its first words, like "this". */
  complete?: boolean
}

function optionReadings(field: RecordField, text: string): Reading[] {
  return recordFieldOptions(field).flatMap((option) => {
    const q = bestQuality([option.label, option.value], text)
    return q > 0
      ? [
          {
            filter: {
              field: field.key,
              operator: 'is',
              values: [option.value]
            },
            label: `${field.label} is ${option.label}`,
            quality: q
          }
        ]
      : []
  })
}

function booleanReadings(field: RecordField, text: string): Reading[] {
  const q = quality(field.label, text)
  return q > 0
    ? [
        {
          filter: { field: field.key, operator: 'is-true' },
          label: `${field.label} is true`,
          quality: q * 0.95
        }
      ]
    : []
}

function dateReadings(
  dateFields: readonly RecordField[],
  text: string,
  options: ParseQueryOptions
): Reading[] {
  const phrases = parseDatePhrase(text, options)
  return phrases.flatMap((phrase, p) =>
    dateFields.flatMap((field, f) => {
      const filter = dateFilter(field, phrase.value)
      if (!filter) return []
      const range = phraseRange(phrase.value)
      const detail = range && describeDateRange(range, options).detail
      const completed = isDatePhraseCompletion(phrase)
      return [
        {
          filter,
          label: `${field.label}: ${phrase.label}`,
          quality:
            (p === 0 ? 1 : 0.9) * (completed ? 0.8 : 1) * DATE_FIELD_DECAY ** f,
          complete: !completed,
          ...(detail && detail !== phrase.label && { description: detail })
        }
      ]
    })
  )
}

function identifierReadings(
  fields: readonly RecordField[],
  text: string
): Reading[] {
  return fields.flatMap((field) =>
    field.match && isLiteral(field.match, text)
      ? [
          {
            filter: { field: field.key, operator: 'is', values: [text] },
            label: `${field.label} is ${text}`,
            quality: 1,
            exact: true
          }
        ]
      : []
  )
}

/** Readings of `value` for one named field, as in `venue:quilted`. */
function fieldValueReadings(
  field: RecordField,
  value: string,
  options: ParseQueryOptions
): Reading[] {
  const text = value.toLowerCase()
  switch (field.type) {
    case 'option':
      return optionReadings(field, text)
    case 'text':
      return [
        ...identifierReadings([field], value),
        {
          filter: { field: field.key, operator: 'contains', value },
          label: `${field.label} contains "${value}"`,
          quality: 0.9
        }
      ]
    case 'number':
    case 'money': {
      const reading = numberFilter(field, text.replace(/\s+/g, ''))
      return reading ? [{ ...reading, quality: 1 }] : []
    }
    case 'boolean': {
      const yes = TRUE_WORDS.has(text)
      if (!yes && !FALSE_WORDS.has(text)) return []
      return [
        {
          filter: { field: field.key, operator: yes ? 'is-true' : 'is-false' },
          label: `${field.label} is ${yes ? 'true' : 'false'}`,
          quality: 1
        }
      ]
    }
    case 'date':
      return dateReadings([field], value, options)
  }
}

function filterSuggestion(
  reading: Reading,
  score: number,
  remainder: string,
  span: [number, number],
  order: number
): Candidate {
  return {
    id: `filter:${encodeFilter(reading.filter)}`,
    kind: 'filter',
    label: reading.label,
    value: reading.filter,
    score,
    remainder,
    span,
    order,
    ...(reading.description && { description: reading.description }),
    ...(reading.exact && { exact: true })
  }
}

function fieldSuggestion(
  field: RecordField,
  score: number,
  remainder: string,
  span: [number, number],
  order: number
): Candidate {
  return {
    id: `field:${field.key}`,
    kind: 'field',
    label: field.label,
    value: { field: field.key },
    score,
    remainder,
    span,
    order
  }
}

function round(score: number): number {
  return Math.round(score * 1000) / 1000
}

function spanCandidates(
  words: readonly string[],
  fields: readonly RecordField[],
  options: ParseQueryOptions
): Candidate[] {
  const dateFields = fields.filter((f) => f.type === 'date')
  const candidates: Candidate[] = []
  const maxSpan = words.length > MAX_WORDS ? MAX_SPAN : words.length
  for (let start = 0; start < words.length; start++) {
    for (
      let end = start + 1;
      end <= Math.min(words.length, start + maxSpan);
      end++
    ) {
      const span: [number, number] = [start, end]
      const text = words.slice(start, end).join(' ').toLowerCase()
      const remainder = [...words.slice(0, start), ...words.slice(end)].join(
        ' '
      )
      const weight = 0.4 + (0.6 * (end - start)) / words.length
      let order = 0
      const add = (reading: Reading) => {
        candidates.push(
          filterSuggestion(
            reading,
            round(reading.quality * weight),
            remainder,
            span,
            order++
          )
        )
      }
      // Exact only when it is the whole text: Enter must not drop the rest.
      if (end - start === 1 && words.length > 1) {
        identifierReadings(fields, words[start]!).forEach((reading) =>
          add({ ...reading, exact: false })
        )
      }
      fields.forEach((field) => {
        const q = Math.max(quality(field.label, text), quality(field.key, text))
        if (q > 0) {
          candidates.push(
            fieldSuggestion(
              field,
              round(q * FIELD_WEIGHT * weight),
              remainder,
              span,
              order++
            )
          )
        }
        if (field.type === 'option') optionReadings(field, text).forEach(add)
        if (field.type === 'boolean') booleanReadings(field, text).forEach(add)
      })
      // A phrase is only completed while it is still being typed, at the end.
      const typing = end === words.length
      if (dateFields.length) {
        dateReadings(dateFields, text, options)
          .filter((reading) => typing || reading.complete !== false)
          .forEach(add)
      }
    }
  }
  return candidates
}

function overlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1]
}

/**
 * Best first, except that the best reading of each separate part of the text
 * comes before the runners-up, so "melb this weekend" offers both its city
 * and its dates at the top.
 */
function rank(candidates: Candidate[]): Candidate[] {
  const byId = new Map<string, Candidate>()
  for (const candidate of candidates) {
    const seen = byId.get(candidate.id)
    if (!seen || candidate.score > seen.score) byId.set(candidate.id, candidate)
  }
  const sorted = [...byId.values()].sort(
    (a, b) =>
      b.score - a.score ||
      (a.kind === b.kind ? 0 : a.kind === 'filter' ? -1 : 1) ||
      a.span[0] - b.span[0] ||
      a.order - b.order
  )
  const leaders: Candidate[] = []
  for (const candidate of sorted) {
    if (leaders.every((leader) => !overlap(leader.span, candidate.span))) {
      leaders.push(candidate)
    }
  }
  return [...leaders, ...sorted.filter((c) => !leaders.includes(c))]
}

/** The field named before a colon, the longest name first, so a label may hold a colon. */
function namedField(
  input: string,
  fields: readonly RecordField[]
): { field: RecordField; value: string } | undefined {
  const text = input.toLowerCase()
  let best: { field: RecordField; value: string; length: number } | undefined
  for (const field of fields) {
    for (const name of [field.key, field.label]) {
      const prefix = name.trim().toLowerCase()
      if (!prefix || (best && prefix.length <= best.length)) continue
      const rest = text.slice(prefix.length).trimStart()
      if (text.startsWith(prefix) && rest.startsWith(':')) {
        const at = input.length - rest.length + 1
        best = { field, value: input.slice(at).trim(), length: prefix.length }
      }
    }
  }
  return best && { field: best.field, value: best.value }
}

function finish(options: ParseQueryOptions) {
  const { entity, fields } = options
  const dateKeys = new Set(
    fields.filter((field) => field.type === 'date').map((field) => field.key)
  )
  return ({ span: _span, order: _order, ...suggestion }: Candidate) => {
    // A chip reads the same words; a date keeps the phrase as typed.
    const label =
      suggestion.kind === 'filter' && !dateKeys.has(suggestion.value.field)
        ? describeRecordFilter(suggestion.value, fields, options).label
        : suggestion.label
    return (
      entity
        ? { ...suggestion, label, id: `${entity}:${suggestion.id}`, entity }
        : { ...suggestion, label }
    ) as RecordSuggestion
  }
}

/**
 * Suggestions for typed text, best first, from field definitions alone, so
 * the same function serves one list screen or a search across entities.
 * Reads identifiers (a field's `match`, offered as exact), `field:value`,
 * field names, option and status values, booleans by name, and date phrases
 * for each date field. A number field's `field:value` takes `100`, `>100`,
 * `<100`, `!=100` or `100-500`, with `$` and thousands commas allowed.
 * Filter labels read as `describeRecordFilter` writes chips. Empty text lists the filterable fields. Free text is
 * left to the caller, as a search.
 */
export function parseQuery(
  text: string,
  options: ParseQueryOptions
): RecordSuggestion[] {
  const { limit = 10 } = options
  const strip = finish(options)
  const fields = options.fields.filter(isFilterable)
  const input = text.trim().replace(/\s+/g, ' ')
  if (!input) {
    return fields
      .slice(0, limit)
      .map((field, i) => strip(fieldSuggestion(field, 0, '', [0, 0], i)))
  }

  const words = input.split(' ')
  const whole: [number, number] = [0, words.length]
  const identifiers = identifierReadings(fields, input).map((reading, i) =>
    filterSuggestion(reading, 1, '', whole, i)
  )

  const named = namedField(input, fields)
  if (named) {
    const { field, value } = named
    const readings = value
      ? fieldValueReadings(field, value, options).map((reading, i) =>
          filterSuggestion(reading, round(reading.quality), '', whole, i)
        )
      : [fieldSuggestion(field, 1, '', whole, 0)]
    return rank([...identifiers, ...readings])
      .slice(0, limit)
      .map(strip)
  }

  return rank([...identifiers, ...spanCandidates(words, fields, options)])
    .slice(0, limit)
    .map(strip)
}
