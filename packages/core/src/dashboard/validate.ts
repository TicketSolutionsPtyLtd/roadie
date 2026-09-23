import type { core } from 'zod'

import { findRowGaps } from './pack'
import {
  type CardKind,
  type CardSize,
  type DashboardCard,
  type DashboardSpec,
  dashboardSchema
} from './schema'

export type DashboardProblem = {
  path: string
  message: string
  severity: 'error' | 'warning'
}

export type DashboardValidation =
  | { ok: true; dashboard: DashboardSpec; problems: DashboardProblem[] }
  | { ok: false; problems: DashboardProblem[] }

export const COPY_LIMITS: Record<CardSize, { label: number; context: number }> =
  {
    stat: { label: 20, context: 26 },
    sm: { label: 28, context: 36 },
    md: { label: 40, context: 60 },
    lg: { label: 48, context: 72 },
    full: { label: 60, context: 96 }
  }

const ALLOWED_SIZES: Record<CardKind, readonly CardSize[]> = {
  stat: ['stat'],
  table: ['sm', 'md', 'lg', 'full'],
  chart: ['sm', 'md', 'lg', 'full'],
  note: ['sm', 'md', 'lg', 'full']
}

const MAX_VISUAL_COLUMNS = 2
const DASH = /[–—]|\s-\s/
const TITLE_CASE = /^(?:\S+\s+)(?:[A-Z][a-z]{3,}\s*){2,}/

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

const error = (path: string, message: string): DashboardProblem => ({
  path,
  message,
  severity: 'error'
})
const warning = (path: string, message: string): DashboardProblem => ({
  path,
  message,
  severity: 'warning'
})

function schemaProblems(issues: readonly core.$ZodIssue[]) {
  return issues.map((issue) => error(toPath(issue.path), issue.message))
}

function copyProblems(path: string, field: string, text: string | undefined) {
  if (!text) return []
  const problems: DashboardProblem[] = []
  if (DASH.test(text))
    problems.push(
      warning(`${path}.${field}`, 'Use "to" or a full stop instead of a dash')
    )
  if (TITLE_CASE.test(text))
    problems.push(warning(`${path}.${field}`, 'Use sentence case'))
  return problems
}

function cardProblems(card: DashboardCard, path: string) {
  const problems: DashboardProblem[] = []
  if (!ALLOWED_SIZES[card.kind].includes(card.size))
    problems.push(
      error(
        `${path}.size`,
        `A ${card.kind} card can't be ${card.size}. Use ${ALLOWED_SIZES[card.kind].join(', ')}`
      )
    )

  const limits = COPY_LIMITS[card.size]
  if (card.label.length > limits.label)
    problems.push(
      warning(
        `${path}.label`,
        `${card.label.length} characters, will truncate at ${card.size} size (limit ${limits.label})`
      )
    )
  if (card.context && card.context.length > limits.context)
    problems.push(
      warning(
        `${path}.context`,
        `${card.context.length} characters, will truncate at ${card.size} size (limit ${limits.context})`
      )
    )

  if (
    (card.kind === 'chart' || card.kind === 'table') &&
    card.value !== undefined &&
    card.takeaway
  )
    problems.push(
      error(
        `${path}.takeaway`,
        'Use a value with a delta, or a takeaway, not both'
      )
    )

  const columns =
    card.kind === 'table'
      ? card.columns
      : card.kind === 'chart'
        ? card.table.columns
        : []
  const visual = columns.filter(
    (column) => column.kind === 'sparkline' || column.kind === 'meter'
  )
  if (visual.length > MAX_VISUAL_COLUMNS)
    problems.push(
      error(
        `${path}.${card.kind === 'chart' ? 'table.columns' : 'columns'}`,
        `At most ${MAX_VISUAL_COLUMNS} sparkline or meter columns`
      )
    )

  problems.push(...copyProblems(path, 'label', card.label))
  problems.push(...copyProblems(path, 'context', card.context))
  if (card.kind === 'chart' || card.kind === 'table')
    problems.push(...copyProblems(path, 'takeaway', card.takeaway))
  if (card.kind === 'note')
    problems.push(...copyProblems(path, 'body', card.body))
  return problems
}

export function validateDashboard(input: unknown): DashboardValidation {
  const parsed = dashboardSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, problems: schemaProblems(parsed.error.issues) }

  const dashboard = parsed.data
  const problems: DashboardProblem[] = []
  const seen = new Set<string>()

  dashboard.sections.forEach((section, s) => {
    const sectionPath = `sections[${s}]`
    problems.push(...copyProblems(sectionPath, 'title', section.title))
    section.cards.forEach((card, c) => {
      const path = `${sectionPath}.cards[${c}]`
      if (seen.has(card.id))
        problems.push(error(`${path}.id`, `Duplicate id "${card.id}"`))
      seen.add(card.id)
      problems.push(...cardProblems(card, path))
    })
    for (const gap of findRowGaps(section.cards))
      problems.push(
        warning(
          sectionPath,
          `Row ${gap.row + 1} leaves ${gap.emptyTracks} empty column${gap.emptyTracks === 1 ? '' : 's'} on ${gap.width} after ${gap.ids.join(', ')}`
        )
      )
  })

  return problems.some((problem) => problem.severity === 'error')
    ? { ok: false, problems }
    : { ok: true, dashboard, problems }
}
