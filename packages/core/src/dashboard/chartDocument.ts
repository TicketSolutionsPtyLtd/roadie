import {
  type DashboardProblem,
  headlineCopyProblems,
  plotProblems,
  schemaProblems,
  valueOrTakeawayProblems
} from './cardChecks'
import { type ChartDocument, chartDocumentSchema } from './schema'

/** @beta */
export type ChartDocumentValidation =
  | { ok: true; document: ChartDocument; problems: DashboardProblem[] }
  | { ok: false; problems: DashboardProblem[] }

/**
 * Checks a chart document with the same rules as a dashboard's chart card,
 * with paths from the document's root, such as `plot.y`.
 *
 * @beta The document's shape may change until the documents package agrees
 * with it.
 */
export function validateChartDocument(input: unknown): ChartDocumentValidation {
  const parsed = chartDocumentSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, problems: schemaProblems(parsed.error.issues) }

  const document = parsed.data
  const problems = [
    ...valueOrTakeawayProblems(document, ''),
    ...headlineCopyProblems(document, ''),
    ...(document.plot.kind === 'static'
      ? []
      : plotProblems(document.plot, 'plot'))
  ]
  return problems.some((problem) => problem.severity === 'error')
    ? { ok: false, problems }
    : { ok: true, document, problems }
}
