import {
  querySuggestionsExample,
  viewMeilisearchExample,
  viewSearchParamsExample
} from '../src/components/records/example.ts'
import { cardSizeTable } from '../src/lib/card-sizes.ts'
import {
  chartLabelLimitsTable,
  copyLimitsTable,
  periodComparisonsTable
} from '../src/lib/dashboard-limits.ts'
import { fence, inlineCode, markdownTable } from '../src/lib/llms.ts'
import { SPOT_ILLUSTRATION_NAMES } from '../src/lib/spot-illustrations.ts'
import {
  type TwinCell,
  type TwinTable,
  segments
} from '../src/lib/twin-table.ts'

export type Renderer = (props: Record<string, string | true>) => string

const cellMarkdown = (cell: TwinCell) =>
  segments(cell)
    .map((segment) =>
      typeof segment === 'string'
        ? segment.replace(/\|/g, '\\|')
        : inlineCode(segment.code)
    )
    .join('')

export const twinTableMarkdown = ({ head, rows }: TwinTable) =>
  markdownTable(
    head,
    rows.map((row) => row.map(cellMarkdown))
  )

/** Markdown for each docs component marked `rendered` in `twin-components.ts`, except those the script builds itself. */
export const DATA_RENDERERS: Record<string, Renderer> = {
  CardSizes: () => twinTableMarkdown(cardSizeTable()),
  ChartLabelLimits: () => twinTableMarkdown(chartLabelLimitsTable()),
  CopyLimits: () => twinTableMarkdown(copyLimitsTable()),
  IllustrationGallery: () =>
    SPOT_ILLUSTRATION_NAMES.map((name) => `- ${inlineCode(name)}`).join('\n'),
  PeriodComparisons: () => twinTableMarkdown(periodComparisonsTable()),
  QuerySuggestions: () => fence('ts', querySuggestionsExample()),
  ViewMeilisearch: () => fence('ts', viewMeilisearchExample()),
  ViewSearchParams: () => fence('text', viewSearchParamsExample())
}
