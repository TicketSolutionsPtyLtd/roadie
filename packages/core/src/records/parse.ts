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

type Candidate = RecordSuggestion & {
  span: [number, number]
  order: number
  /** The id of the filter this one negates, ruled out after its first word. */
  negates?: string
  /** A statement's field name, whose words read no other filter. */
  named?: [number, number]
}

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
const NEGATIONS = new Set([
  'not',
  "isn't",
  'excluding',
  'except',
  'without',
  '!=',
  '≠'
])
// ">=" and "=>" stay whole: read as "=" then ">", they'd drop the number itself.
const OPERATOR = /(!=|[<>]=|=[<>]|≠|[<>=])/g
// A dash before a digit or dollar sign is a minus sign, as in "-5".
const SIGNED = /^-[$\d]/

type Verb = {
  words: readonly string[]
  negated: boolean
  contains: boolean
}

const VERBS: readonly Verb[] = [
  { words: ['is', 'not'], negated: true, contains: false },
  { words: ["isn't"], negated: true, contains: false },
  { words: ['is'], negated: false, contains: false },
  { words: ['!='], negated: true, contains: false },
  { words: ['≠'], negated: true, contains: false },
  { words: ['='], negated: false, contains: false },
  { words: ["doesn't", 'contain'], negated: true, contains: true },
  { words: ['does', 'not', 'contain'], negated: true, contains: true },
  { words: ['contains'], negated: false, contains: true }
]

/** No verb, as in "city melb" or "sold > 100". */
const BARE: Verb = { words: [], negated: false, contains: false }

const isOperator = (word = '') => word.replace(OPERATOR, '') === ''

/** A number's value in symbols: "over 100" as ">100", "20 and 50" as "20-50". */
const numberText = (text: string) =>
  text
    .replace(/^(?:more than|over)\b/, '>')
    .replace(/^(?:less than|under)\b/, '<')
    .replace(/^between\s(.+)\sand\s/, '$1-')
    .replace(/\sand\s/, '-')
    .replace(/\s+/g, '')

/** Lower case, reading a typographic apostrophe as a straight one. */
const plain = (word: string) => word.toLowerCase().replace(/’/g, "'")

/** The value after a leading `!`, `!=`, `≠` or `-`, or null when it isn't negated. */
function negatedValue(value: string): string | null {
  const bang = /^(?:!=?|≠)/.exec(value)
  if (bang) return value.slice(bang[0].length).trimStart()
  if (value.startsWith('-') && !SIGNED.test(value)) return value.slice(1)
  return null
}

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
    const value = [amount(range[1]!), amount(range[2]!)].sort(
      (a, b) => a - b
    ) as [number, number]
    return value.every(Number.isFinite)
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
  negates?: string
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
      const reading = numberFilter(field, numberText(text))
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

function negatedFilter(filter: RecordFilter): RecordFilter | null {
  switch (filter.operator) {
    case 'is':
      return { ...filter, operator: 'is-not' }
    case 'contains':
      return { ...filter, operator: 'not-contains' }
    case 'eq':
      return { ...filter, operator: 'neq' }
    case 'neq':
      return { ...filter, operator: 'eq' }
    case 'is-true':
      return { field: filter.field, operator: 'is-false' }
    case 'is-false':
      return { field: filter.field, operator: 'is-true' }
    default:
      return null
  }
}

/** The opposite of each reading that has one; the label comes from the filter. */
function negate(readings: readonly Reading[]): Reading[] {
  return readings.flatMap(({ exact: _exact, ...reading }) => {
    const filter = negatedFilter(reading.filter)
    const negates = `filter:${encodeFilter(reading.filter)}`
    return filter ? [{ ...reading, filter, negates }] : []
  })
}

/** Option values and booleans by name, the readings a bare negation can flip. */
function valueReadings(
  fields: readonly RecordField[],
  text: string
): Reading[] {
  return fields.flatMap((field) => {
    if (field.type === 'option') return optionReadings(field, text)
    if (field.type === 'boolean') return booleanReadings(field, text)
    return []
  })
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
    ...(reading.exact && { exact: true }),
    ...(reading.negates && { negates: reading.negates })
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

const spanWeight = (start: number, end: number, length: number) =>
  0.4 + (0.6 * (end - start)) / length

const remainderOf = (words: readonly string[], start: number, end: number) =>
  [...words.slice(0, start), ...words.slice(end)].join(' ')

function spanCandidates(
  words: readonly string[],
  fields: readonly RecordField[],
  options: ParseQueryOptions
): Candidate[] {
  const dateFields = fields.filter((f) => f.type === 'date')
  const candidates: Candidate[] = []
  const maxSpan = words.length > MAX_WORDS ? MAX_SPAN : words.length
  for (let start = 0; start < words.length; start++) {
    // "not melb" and "-melb" never offer Melbourne itself.
    const ruledOut = start > 0 && NEGATIONS.has(plain(words[start - 1]!))
    for (
      let end = start + 1;
      end <= Math.min(words.length, start + maxSpan);
      end++
    ) {
      const span: [number, number] = [start, end]
      const text = words.slice(start, end).join(' ').toLowerCase()
      const remainder = remainderOf(words, start, end)
      const weight = spanWeight(start, end, words.length)
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
      })
      const dashed = negatedValue(words[start]!)
      const negated = dashed
        ? [dashed, ...words.slice(start + 1, end)].join(' ')
        : end - start > 1 && NEGATIONS.has(plain(words[start]!))
          ? words.slice(start + 1, end).join(' ')
          : null
      if (!ruledOut && dashed === null) {
        // Exact only when it is the whole text: Enter must not drop the rest.
        if (end - start === 1 && words.length > 1) {
          identifierReadings(fields, words[start]!).forEach((reading) =>
            add({ ...reading, exact: false })
          )
        }
        valueReadings(fields, text).forEach(add)
        // A phrase is only completed while it is still being typed, at the end.
        const typing = end === words.length
        if (dateFields.length) {
          dateReadings(dateFields, text, options)
            .filter((reading) => typing || reading.complete !== false)
            .forEach(add)
        }
      }
      if (negated) {
        negate([
          ...identifierReadings(fields, negated),
          ...valueReadings(fields, negated.toLowerCase())
        ]).forEach(add)
      }
    }
  }
  return candidates
}

/** The number of words from `start` that name the field, or 0. */
function nameLength(
  field: RecordField,
  words: readonly string[],
  start: number
): number {
  return Math.max(
    ...[field.key, field.label].map((name) => {
      const parts = plain(name).trim().split(/\s+/)
      return parts.every((part, i) => words[start + i] === part)
        ? parts.length
        : 0
    })
  )
}

/** "<field> is <value>", "<field> is not <value>", "<field> doesn't contain <value>" and the like. */
function statementCandidates(
  words: readonly string[],
  fields: readonly RecordField[],
  options: ParseQueryOptions
): Candidate[] {
  const lower = words.map(plain)
  const candidates: Candidate[] = []
  for (let start = 0; start < words.length; start++) {
    let order = 0
    const next = () => order++
    for (const field of fields) {
      const named = nameLength(field, lower, start)
      if (!named) continue
      const numeric = field.type === 'number' || field.type === 'money'
      const at = start + named
      const verbs = VERBS.filter((verb) =>
        verb.words.every((word, i) => lower[at + i] === word)
      )
      // Only a number compares with no verb: "city > syd" stays text.
      if (!verbs.length && (numeric || !isOperator(lower[at]))) verbs.push(BARE)
      for (const verb of verbs) {
        candidates.push(
          ...statementValues(words, field, verb, [start, at], options, next)
        )
      }
    }
  }
  return candidates
}

/**
 * Statements with their operators spaced apart, so "city!=syd" reads as
 * "city != syd", each spanning the typed words it touches.
 */
function spacedStatements(
  words: readonly string[],
  fields: readonly RecordField[],
  options: ParseQueryOptions
): Candidate[] {
  const wordOf: number[] = []
  const pieces = words.flatMap((word, i) => {
    const split = word.replace(OPERATOR, ' $1 ').trim().split(/\s+/)
    wordOf.push(...split.map(() => i))
    return split
  })
  const touched = ([start, end]: [number, number]): [number, number] => [
    wordOf[start]!,
    wordOf[end - 1]! + 1
  ]
  return statementCandidates(pieces, fields, options).map((candidate) => {
    const span = touched(candidate.span)
    return {
      ...candidate,
      span,
      remainder: remainderOf(words, ...span),
      named: touched(candidate.named!)
    }
  })
}

/** Each reading of the words after a statement's verb, as one candidate. */
function statementValues(
  words: readonly string[],
  field: RecordField,
  verb: Verb,
  named: [number, number],
  options: ParseQueryOptions,
  next: () => number
): Candidate[] {
  const [start, at] = named
  const from = at + verb.words.length
  const last = Math.min(words.length, from + MAX_SPAN)
  const candidates: Candidate[] = []
  for (let end = from + 1; end <= last; end++) {
    const typing = end === words.length
    const readings = fieldValueReadings(
      field,
      words.slice(from, end).join(' '),
      options
    ).filter(
      (reading) =>
        (!verb.contains || reading.filter.operator === 'contains') &&
        (typing || reading.complete !== false)
    )
    const weight = spanWeight(start, end, words.length)
    const remainder = remainderOf(words, start, end)
    for (const reading of verb.negated ? negate(readings) : readings) {
      candidates.push({
        ...filterSuggestion(
          // Enter takes an exact reading, so it must leave nothing.
          remainder ? { ...reading, exact: false } : reading,
          round(reading.quality * weight),
          remainder,
          [start, end],
          next()
        ),
        named
      })
    }
  }
  return candidates
}

function overlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1]
}

function within(inner: [number, number], outer: [number, number]): boolean {
  return outer[0] <= inner[0] && inner[1] <= outer[1]
}

/**
 * Best first, except that the best reading of each separate part of the text
 * comes before the runners-up, so "melb this weekend" offers both its city
 * and its dates at the top.
 */
function rank(candidates: Candidate[]): Candidate[] {
  // "status is not sold out" never offers Sold out from its last word. A
  // reading that takes the negating word too, like "Not on sale", stays.
  const negations = candidates.filter((c) => c.negates)
  // "sold > 100" never offers Sold out from the field's name.
  const names = candidates.flatMap((c) => (c.named ? [c.named] : []))
  const byId = new Map<string, Candidate>()
  for (const candidate of candidates) {
    if (
      negations.some(
        (n) => n.negates === candidate.id && n.span[0] < candidate.span[0]
      ) ||
      (candidate.kind === 'filter' &&
        !candidate.named &&
        names.some((name) => within(candidate.span, name)))
    )
      continue
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
  return ({
    span: _span,
    order: _order,
    negates: _negates,
    named: _named,
    ...suggestion
  }: Candidate) => {
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
 * `<field> <value>`, `<field> is <value>` and `<field> contains <value>`, field names, option
 * and status values, booleans by name, and date phrases for each date field.
 * A number field's `field:value` takes `100`, `>100`, `<100`, `!=100`,
 * `100-500`, `over 100`, `under 100` or `100 and 500`, with `$` and thousands
 * commas allowed; `<field> > 100`, `<field> more than 100`,
 * `<field> between 100 and 500` and `<field> 100-500` read the same. Negation reads as the
 * opposite filter: a `-` before a value (not a number), `not`, `isn't`,
 * `excluding`, `except`, `without`, `!=` or `≠` before a value,
 * `<field> is not`, `isn't`, `!=`, `≠`, `doesn't contain` or
 * `does not contain`, and `field:!value`, `field:!=value` or `field:-value`;
 * a date or a comparison has no opposite, so reads nothing.
 * Filter labels read as `describeRecordFilter` writes chips. Empty text lists
 * the filterable fields. Free text is left to the caller, as a search.
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
    const { field } = named
    const negated = negatedValue(named.value)
    const value = negated ?? named.value
    const read = (readings: Reading[]) =>
      negated === null ? readings : negate(readings)
    const readings = value
      ? read(fieldValueReadings(field, value, options)).map((reading, i) =>
          filterSuggestion(reading, round(reading.quality), '', whole, i)
        )
      : [fieldSuggestion(field, 1, '', whole, 0)]
    return rank([...identifiers, ...readings])
      .slice(0, limit)
      .map(strip)
  }

  return rank([
    ...identifiers,
    ...spanCandidates(words, fields, options),
    ...spacedStatements(words, fields, options)
  ])
    .slice(0, limit)
    .map(strip)
}
