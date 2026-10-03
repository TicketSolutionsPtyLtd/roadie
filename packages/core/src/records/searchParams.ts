import {
  decodeRange,
  decodeSort,
  encodeFilter,
  encodeSort,
  joinItems,
  splitItems,
  toNumber,
  unescape
} from './encoding'
import { fieldIndex } from './fields'
import type {
  RecordField,
  RecordLayout,
  RecordPosition,
  RecordView,
  RecordViewProblem
} from './types'
import { validateRecordView } from './validate'

export const RECORD_VIEW_FORMAT = '1'

export type RecordSearchParamsInput =
  | URLSearchParams
  | string
  | Record<string, string | readonly string[] | undefined>

export type RecordSearchParamsResult = {
  view: RecordView
  position: RecordPosition
  /** `fallback` when the URL held no view, or one that failed validation. */
  source: 'url' | 'fallback'
  problems: RecordViewProblem[]
}

const EMPTY_VIEW: RecordView = {
  query: { search: '', filters: [], sort: [] },
  layout: { type: 'table' }
}

type Decoded = { filter: unknown } | { problem: string; at?: string }

function decodeFilter(text: string, byKey: Map<string, RecordField>): Decoded {
  const first = text.indexOf(':')
  if (first < 0) {
    return {
      problem: `Write each filter as field:operator[:value], not "${text}"`
    }
  }
  const field = unescape(text.slice(0, first))
  const rest = text.slice(first + 1)
  const second = rest.indexOf(':')
  const operator = second < 0 ? rest : rest.slice(0, second)
  const payload = second < 0 ? '' : rest.slice(second + 1)
  const type = byKey.get(field)?.type
  switch (operator) {
    case 'is':
    case 'is-not':
    case 'has-all':
      return { filter: { field, operator, values: splitItems(payload) } }
    case 'between': {
      const items = splitItems(payload)
      if (items.length !== 2) {
        return {
          problem: 'Between takes two values, like 100,500',
          at: '.value'
        }
      }
      const value = type === 'date' ? items : items.map(toNumber)
      return { filter: { field, operator, value } }
    }
    case 'within':
      return { filter: { field, operator, value: decodeRange(payload) } }
    case 'eq':
    case 'neq':
    case 'lt':
    case 'gt':
      return { filter: { field, operator, value: toNumber(payload) } }
    case 'contains':
    case 'not-contains':
    case 'on':
    case 'before':
    case 'after':
      return { filter: { field, operator, value: payload } }
    default:
      return { filter: { field, operator } }
  }
}

function layoutEntries(layout: RecordLayout): [string, string][] {
  if (layout.type === 'grid') {
    return [
      ['layout', 'grid'],
      ...(layout.fields?.length
        ? [['fields', joinItems(layout.fields)] as [string, string]]
        : [])
    ]
  }
  const { order, hidden } = layout.columns ?? {}
  const entries: [string, string][] = []
  if (order?.length) entries.push(['columns', joinItems(order)])
  if (hidden?.length) entries.push(['hidden', joinItems(hidden)])
  return entries.length ? [['layout', 'table'], ...entries] : []
}

/**
 * A view, and optionally where the reader is in it, as URL search params in
 * format v1. Keys come in a fixed order and empty parts are left out, so the
 * same view always gives the same URL. The name stays out: a URL view has
 * none. Merge the result into your own params to keep theirs.
 */
export function toSearchParams(
  view: RecordView,
  position: RecordPosition = {}
): URLSearchParams {
  const params = new URLSearchParams()
  params.set('v', RECORD_VIEW_FORMAT)
  if (view.id) params.set('view', view.id)
  if (view.entity) params.set('entity', view.entity)
  if (view.query.search) params.set('q', view.query.search)
  for (const filter of view.query.filters) {
    params.append('f', encodeFilter(filter))
  }
  if (view.query.sort.length) params.set('sort', encodeSort(view.query.sort))
  for (const [key, value] of layoutEntries(view.layout)) params.set(key, value)
  if (view.group) params.set('group', view.group)
  if (position.page !== undefined) params.set('page', String(position.page + 1))
  if (position.pageSize !== undefined) {
    params.set('size', String(position.pageSize))
  }
  if (position.row !== undefined) params.set('row', String(position.row))
  return params
}

function toParams(input: RecordSearchParamsInput): URLSearchParams {
  if (input instanceof URLSearchParams || typeof input === 'string') {
    return new URLSearchParams(input)
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue
    for (const item of typeof value === 'string' ? [value] : value) {
      params.append(key, item)
    }
  }
  return params
}

function whole(text: string | null, min: number): number | undefined {
  if (text === null || !/^\d+$/.test(text)) return undefined
  const n = Number(text)
  return Number.isSafeInteger(n) && n >= min ? n : undefined
}

function readPosition(params: URLSearchParams): RecordPosition {
  const page = whole(params.get('page'), 1)
  const pageSize = whole(params.get('size'), 1)
  const row = whole(params.get('row'), 0)
  return {
    ...(page !== undefined && { page: page - 1 }),
    ...(pageSize !== undefined && { pageSize }),
    ...(row !== undefined && { row })
  }
}

function readLayout(
  params: URLSearchParams
): RecordLayout | { problem: string } {
  const type = params.get('layout') ?? 'table'
  if (type === 'grid') {
    const fields = splitItems(params.get('fields') ?? '')
    return { type: 'grid', ...(fields.length && { fields }) }
  }
  if (type !== 'table') return { problem: `Unknown layout "${type}"` }
  const order = splitItems(params.get('columns') ?? '')
  const hidden = splitItems(params.get('hidden') ?? '')
  const columns = {
    ...(order.length && { order }),
    ...(hidden.length && { hidden })
  }
  return {
    type: 'table',
    ...(Object.keys(columns).length && { columns })
  }
}

function problem(path: string, message: string): RecordViewProblem {
  return { path, message, severity: 'error' }
}

/**
 * Reads a view and position written by `toSearchParams`. Unknown keys are
 * ignored. A URL with no view, a format it does not know, or a view that
 * fails `validateRecordView` gives `fallback` (an empty table view by
 * default) with the problems that caused it; the position is read either way.
 */
export function fromSearchParams(
  input: RecordSearchParamsInput,
  fields: readonly RecordField[],
  { fallback = EMPTY_VIEW }: { fallback?: RecordView } = {}
): RecordSearchParamsResult {
  const params = toParams(input)
  const position = readPosition(params)
  const fail = (problems: RecordViewProblem[]): RecordSearchParamsResult => ({
    view: fallback,
    position,
    source: 'fallback',
    problems
  })
  const version = params.get('v')
  if (version === null) return fail([])
  if (version !== RECORD_VIEW_FORMAT) {
    return fail([problem('v', `Unsupported view format "${version}"`)])
  }

  const byKey = fieldIndex(fields)
  const filters: unknown[] = []
  const decodeProblems: RecordViewProblem[] = []
  params.getAll('f').forEach((text, i) => {
    const decoded = decodeFilter(text, byKey)
    if ('problem' in decoded) {
      decodeProblems.push(
        problem(`query.filters[${i}]${decoded.at ?? ''}`, decoded.problem)
      )
    }
    filters.push('filter' in decoded ? decoded.filter : null)
  })
  const layout = readLayout(params)
  if ('problem' in layout)
    decodeProblems.push(problem('layout', layout.problem))
  if (decodeProblems.length) return fail(decodeProblems)

  const view = {
    ...(params.get('view') && { id: params.get('view')! }),
    ...(params.get('entity') && { entity: params.get('entity')! }),
    query: {
      search: params.get('q') ?? '',
      filters,
      sort: decodeSort(params.get('sort') ?? '')
    },
    layout,
    ...(params.get('group') && { group: params.get('group')! })
  }
  const result = validateRecordView(view, fields)
  if (!result.ok) return fail(result.problems)
  return {
    view: result.view,
    position,
    source: 'url',
    problems: result.problems
  }
}
