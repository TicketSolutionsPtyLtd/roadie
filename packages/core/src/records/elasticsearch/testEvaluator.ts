/**
 * A small evaluator for the subset of Elasticsearch's query DSL that
 * `toElasticsearch` writes, following Elasticsearch's documented rules: a
 * query on a list matches when any value does, `must_not` keeps documents
 * missing the field, `exists` skips null, empty lists and empty objects,
 * `case_insensitive` folds case, and a `||/d` upper bound rounds up to the
 * end of its day. Dates parse as UTC, as a `date` mapping does. Test-only.
 */
type Doc = Record<string, unknown>
type Clause = Record<string, unknown>
type Bounds = { gt?: unknown; gte?: unknown; lt?: unknown; lte?: unknown }

const DAY = 86_400_000

function values(doc: Doc, path: string): unknown[] {
  const value = doc[path]
  const found = Array.isArray(value) ? value : [value]
  return found.filter((v) => v !== undefined && v !== null)
}

function only(clause: Clause): [string, Record<string, unknown>] {
  const [entry] = Object.entries(clause)
  return entry as [string, Record<string, unknown>]
}

function equal(actual: unknown, expected: unknown, fold: boolean): boolean {
  if (typeof expected === 'string') {
    return typeof actual === 'string' && fold
      ? actual.toLowerCase() === expected.toLowerCase()
      : actual === expected
  }
  // Boolean and numeric mappings coerce strings when they index them.
  if (typeof expected === 'boolean') return String(actual) === String(expected)
  return Number(actual) === expected
}

function wildcard(pattern: string, fold: boolean): RegExp {
  let source = ''
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]!
    if (char === '\\')
      source += pattern[++i]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    else if (char === '*') source += '.*'
    else if (char === '?') source += '.'
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${source}$`, fold ? 'is' : 's')
}

const OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/

// A date-time with no offset is UTC, not the machine's zone.
function instant(value: unknown): number {
  if (typeof value === 'number') return value
  const text = String(value)
  return Date.parse(text.length > 10 && !OFFSET.test(text) ? `${text}Z` : text)
}

function dayBound(text: unknown, roundUp: boolean): number {
  const [day, math] = String(text).split('||')
  const start = Date.parse(`${day}T00:00:00Z`)
  if (math && math !== '/d') throw new Error(`Unread date math: ${math}`)
  return math && roundUp ? start + DAY - 1 : start
}

function inRange(actual: unknown, bounds: Bounds, format: unknown): boolean {
  if (!format && Object.values(bounds).every((b) => typeof b === 'string')) {
    // A keyword indexes numbers and booleans as their text.
    return typeof actual !== 'object' && within(String(actual), bounds, String)
  }
  const read: (bound: unknown, roundUp: boolean) => number =
    format === 'yyyy-MM-dd' ? dayBound : (bound) => Number(bound)
  const value = format ? instant(actual) : Number(actual)
  return !Number.isNaN(value) && within(value, bounds, read)
}

// A keyword range compares text; JavaScript's order agrees with Lucene's for
// the bounds the adapter writes.
function within<T extends number | string>(
  value: T,
  bounds: Bounds,
  read: (bound: unknown, roundUp: boolean) => T
): boolean {
  if (bounds.gt !== undefined && !(value > read(bounds.gt, false))) return false
  if (bounds.gte !== undefined && !(value >= read(bounds.gte, false)))
    return false
  if (bounds.lt !== undefined && !(value < read(bounds.lt, false))) return false
  if (bounds.lte !== undefined && !(value <= read(bounds.lte, true)))
    return false
  return true
}

function exists(actual: unknown): boolean {
  return !(
    typeof actual === 'object' &&
    actual !== null &&
    Object.keys(actual).length === 0
  )
}

export function evaluateElasticsearch(clause: Clause, doc: Doc): boolean {
  const [kind, body] = only(clause)
  switch (kind) {
    case 'match_all':
      return true
    case 'bool': {
      const list = (key: string) => (body[key] ?? []) as Clause[]
      const should = list('should')
      return (
        list('must').every((c) => evaluateElasticsearch(c, doc)) &&
        list('filter').every((c) => evaluateElasticsearch(c, doc)) &&
        !list('must_not').some((c) => evaluateElasticsearch(c, doc)) &&
        (should.length === 0 ||
          should.filter((c) => evaluateElasticsearch(c, doc)).length >=
            Number(body.minimum_should_match ?? 1))
      )
    }
    case 'term': {
      const [path, { value, case_insensitive }] = only(body as Clause) as [
        string,
        { value: unknown; case_insensitive?: boolean }
      ]
      return values(doc, path).some((v) =>
        equal(v, value, case_insensitive === true)
      )
    }
    case 'wildcard': {
      const [path, { value, case_insensitive }] = only(body as Clause) as [
        string,
        { value: string; case_insensitive?: boolean }
      ]
      const pattern = wildcard(value, case_insensitive === true)
      return values(doc, path).some(
        (v) => typeof v === 'string' && pattern.test(v)
      )
    }
    case 'range': {
      const [path, { format, ...bounds }] = only(body as Clause) as [
        string,
        Bounds & { format?: unknown }
      ]
      return values(doc, path).some((v) => inRange(v, bounds, format))
    }
    case 'exists':
      return values(doc, String(body.field)).some(exists)
    default:
      throw new Error(`Unread query: ${kind}`)
  }
}
