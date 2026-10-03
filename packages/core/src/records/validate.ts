import type { core } from 'zod'

import { isPlainDate } from '../datetime/plainDate'
import { resolveAbsolute } from '../datetime/ranges'
import {
  fieldIndex,
  isDateList,
  isFilterable,
  isSortable,
  momentOf,
  recordFilterOperators
} from './fields'
import { recordViewSchema } from './schema'
import type {
  RecordField,
  RecordFilter,
  RecordView,
  RecordViewProblem
} from './types'

export type RecordViewValidation =
  | { ok: true; view: RecordView; problems: RecordViewProblem[] }
  | { ok: false; problems: RecordViewProblem[] }

const toPath = (segments: readonly PropertyKey[]) =>
  segments.reduce<string>(
    (path, segment) =>
      typeof segment === 'number'
        ? `${path}[${segment}]`
        : path
          ? `${path}.${String(segment)}`
          : String(segment),
    ''
  )

const error = (path: string, message: string): RecordViewProblem => ({
  path,
  message,
  severity: 'error'
})

const warning = (path: string, message: string): RecordViewProblem => ({
  path,
  message,
  severity: 'warning'
})

const ARTICLE: Record<RecordField['type'], string> = {
  text: 'a text',
  option: 'an option',
  number: 'a number',
  money: 'a money',
  date: 'a date',
  boolean: 'a boolean'
}

function listWords(words: readonly string[]): string {
  return words.length < 2
    ? words.join('')
    : `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`
}

function unknownField(key: string, fields: readonly RecordField[]): string {
  return `Unknown field "${key}". Known fields: ${fields.map((f) => f.key).join(', ')}`
}

export type DateValueKind = 'date' | 'date-time'

/** Whether a string is an ISO date, an ISO date-time, or neither. */
export function dateValueKind(value: string): DateValueKind | null {
  if (isPlainDate(value)) return 'date'
  try {
    resolveAbsolute({ start: value, end: value }, 'UTC')
    return 'date-time'
  } catch {
    return null
  }
}

function dateProblem(field: RecordField, value: string): string | null {
  const kind = dateValueKind(value)
  if (!kind) return 'Use an ISO date, like 2026-10-03'
  if (kind === 'date' || momentOf(field) === 'timestamp') return null
  return momentOf(field) === 'date'
    ? `"${field.label}" holds plain dates, so use a date with no time, like 2026-10-03`
    : `"${field.label}" compares venue-local dates, so use a date with no time, like 2026-10-03`
}

function valueProblem(filter: RecordFilter, field: RecordField): string | null {
  switch (filter.operator) {
    case 'on':
      if (dateValueKind(filter.value) === 'date-time') {
        return 'On takes a date with no time; use between for a span of time'
      }
      return dateProblem(field, filter.value)
    case 'before':
    case 'after':
      return dateProblem(field, filter.value)
    case 'between': {
      const [start, end] = filter.value
      if (field.type === 'date') {
        if (typeof start !== 'string' || typeof end !== 'string') {
          return `"${field.label}" is a date field, so between takes two dates`
        }
        const problem = dateProblem(field, start) ?? dateProblem(field, end)
        if (problem) return problem
        // An end with an offset is fixed; one without moves with the viewer's zone.
        if (OFFSET.test(start) !== OFFSET.test(end)) {
          return 'Give both ends an offset, or neither, so the range means the same in every zone'
        }
        return resolvesInOrder(start, end, 'UTC')
          ? null
          : 'The range starts after it ends'
      }
      if (typeof start !== 'number' || typeof end !== 'number') {
        return `"${field.label}" is ${ARTICLE[field.type]} field, so between takes two numbers`
      }
      return start > end ? 'The range starts after it ends' : null
    }
    case 'within':
      if (
        momentOf(field) === 'date' &&
        typeof filter.value === 'object' &&
        'unit' in filter.value &&
        filter.value.unit === 'hour'
      ) {
        return `"${field.label}" holds plain dates, so it has no hours to count`
      }
      return null
    default:
      return null
  }
}

const OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/

function resolvesInOrder(start: string, end: string, zone: string): boolean {
  try {
    resolveAbsolute({ start, end }, zone)
    return true
  } catch {
    return false
  }
}

function filterProblems(
  filter: RecordFilter,
  path: string,
  fields: readonly RecordField[],
  byKey: Map<string, RecordField>
): RecordViewProblem[] {
  const field = byKey.get(filter.field)
  if (!field)
    return [error(`${path}.field`, unknownField(filter.field, fields))]
  if (isDateList(field)) {
    return [
      error(
        `${path}.field`,
        `"${field.label}" holds a list of dates, which filters cannot read yet`
      )
    ]
  }
  if (!isFilterable(field)) {
    return [error(`${path}.field`, `"${field.label}" is not filterable`)]
  }
  const operators = recordFilterOperators(field)
  if (!operators.includes(filter.operator)) {
    return [
      error(
        `${path}.operator`,
        `"${field.label}" is ${ARTICLE[field.type]} field, so "${filter.operator}" does not fit. Use ${listWords(operators)}`
      )
    ]
  }
  const problem = valueProblem(filter, field)
  return problem ? [error(`${path}.value`, problem)] : []
}

function layoutProblems(
  view: RecordView,
  byKey: Map<string, RecordField>
): RecordViewProblem[] {
  const lists: [string, string[] | undefined][] =
    view.layout.type === 'table'
      ? [
          ['layout.columns.order', view.layout.columns?.order],
          ['layout.columns.hidden', view.layout.columns?.hidden]
        ]
      : [['layout.fields', view.layout.fields]]
  return lists.flatMap(([path, keys = []]) =>
    keys.flatMap((key, i) =>
      byKey.has(key) ? [] : [warning(`${path}[${i}]`, `Unknown field "${key}"`)]
    )
  )
}

function schemaProblems(issues: readonly core.$ZodIssue[]) {
  return issues.map((issue) => error(toPath(issue.path), issue.message))
}

/**
 * Checks a view against an entity's fields: its shape, that every field it
 * names exists, and that each filter's operator and value fit the field.
 * Layout keys a field list does not know are warnings, since a layout may
 * show columns, such as actions, that are not fields.
 */
export function validateRecordView(
  input: unknown,
  fields: readonly RecordField[]
): RecordViewValidation {
  const parsed = recordViewSchema().safeParse(input)
  if (!parsed.success) {
    return { ok: false, problems: schemaProblems(parsed.error.issues) }
  }
  const view = parsed.data as RecordView
  const byKey = fieldIndex(fields)
  const problems: RecordViewProblem[] = []

  view.query.filters.forEach((filter, i) => {
    problems.push(
      ...filterProblems(filter, `query.filters[${i}]`, fields, byKey)
    )
  })
  view.query.sort.forEach((sort, i) => {
    const path = `query.sort[${i}].field`
    const field = byKey.get(sort.field)
    if (!field) problems.push(error(path, unknownField(sort.field, fields)))
    else if (!isSortable(field)) {
      problems.push(error(path, `"${field.label}" is not sortable`))
    }
  })
  problems.push(...layoutProblems(view, byKey))

  return problems.some((p) => p.severity === 'error')
    ? { ok: false, problems }
    : { ok: true, view, problems }
}
