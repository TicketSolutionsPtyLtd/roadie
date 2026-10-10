import { DATE_TIME_TABLES } from '../src/components/date-and-time/example.ts'
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
} from '../src/lib/dashboard-tables.ts'
import { fence, inlineCode, markdownTable } from '../src/lib/llms.ts'
import { SPOT_ILLUSTRATION_NAMES } from '../src/lib/spot-illustrations.ts'
import {
  type TwinCell,
  type TwinTable,
  segments
} from '../src/lib/twin-table.ts'

export type Renderer = (props: Record<string, string | true>) => string

// Segments keep their own spacing, such as " and " between two code values,
// so text is escaped like `prose` without trimming each run.
const segmentText = (text: string) =>
  text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').replace(/</g, '&lt;')

const cellMarkdown = (cell: TwinCell) =>
  segments(cell)
    .map((segment) =>
      typeof segment === 'string'
        ? segmentText(segment)
        : inlineCode(segment.code)
    )
    .join('')
    .trim()

export const twinTableMarkdown = ({ head, rows }: TwinTable) =>
  markdownTable(
    head,
    rows.map((row) => row.map(cellMarkdown))
  )

/** Markdown for each docs component marked `rendered` in `twin-components.ts`, except those the script builds itself. */
export const DATA_RENDERERS: Record<string, Renderer> = {
  ComparisonTable: () => twinTableMarkdown(DATE_TIME_TABLES.ComparisonTable()),
  ComponentReads: () => twinTableMarkdown(DATE_TIME_TABLES.ComponentReads()),
  DataFormatReads: () => twinTableMarkdown(DATE_TIME_TABLES.DataFormatReads()),
  DateStyleScale: () => twinTableMarkdown(DATE_TIME_TABLES.DateStyleScale()),
  MachineValueReads: () =>
    twinTableMarkdown(DATE_TIME_TABLES.MachineValueReads()),
  MomentReads: () => twinTableMarkdown(DATE_TIME_TABLES.MomentReads()),
  PhraseTable: () => twinTableMarkdown(DATE_TIME_TABLES.PhraseTable()),
  RangeTable: () => twinTableMarkdown(DATE_TIME_TABLES.RangeTable()),
  RelativeLadder: ({ direction }) => {
    if (direction !== 'past' && direction !== 'future')
      throw new Error(
        `<RelativeLadder direction="${direction}"> isn't past or future`
      )
    return twinTableMarkdown(DATE_TIME_TABLES.RelativeLadder(direction))
  },
  TimeStyleScale: () => twinTableMarkdown(DATE_TIME_TABLES.TimeStyleScale()),
  ZoneTable: () => twinTableMarkdown(DATE_TIME_TABLES.ZoneTable()),
  CardSizes: () => twinTableMarkdown(cardSizeTable()),
  ChartLabelLimits: () => twinTableMarkdown(chartLabelLimitsTable()),
  CopyLimits: () => twinTableMarkdown(copyLimitsTable()),
  IllustrationGallery: () =>
    SPOT_ILLUSTRATION_NAMES.map((name) => `- \`${name}\``).join('\n'),
  PeriodComparisons: () => twinTableMarkdown(periodComparisonsTable()),
  QuerySuggestions: () => fence('ts', querySuggestionsExample()),
  ViewMeilisearch: () => fence('ts', viewMeilisearchExample()),
  ViewSearchParams: () => fence('text', viewSearchParamsExample())
}
