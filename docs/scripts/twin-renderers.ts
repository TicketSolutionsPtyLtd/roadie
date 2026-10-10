import { readFileSync } from 'node:fs'

import { DATE_TIME_TABLES } from '../src/components/date-and-time/example.ts'
import {
  querySuggestionsExample,
  viewMeilisearchExample,
  viewSearchParamsExample
} from '../src/components/records/example.ts'
import { cardSizeTable } from '../src/lib/card-sizes.ts'
import {
  DATAVIZ_STRIPS,
  type DatavizKind,
  colorScaleTable,
  colorScales,
  datavizTable
} from '../src/lib/color-tables.ts'
import {
  chartLabelLimitsTable,
  copyLimitsTable,
  periodComparisonsTable
} from '../src/lib/dashboard-tables.ts'
import {
  escapeCell,
  fence,
  inlineCode,
  markdownTable
} from '../src/lib/llms.ts'
import { SPOT_ILLUSTRATION_NAMES } from '../src/lib/spot-illustrations.ts'
import {
  type TwinCell,
  type TwinTable,
  segments
} from '../src/lib/twin-table.ts'

export type Renderer = (props: Record<string, string | true>) => string

// Not trimmed per run, so a joining " and " keeps its spaces.
const segmentText = (text: string) => escapeCell(text.replace(/\s+/g, ' '))

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

type ManifestToken = { name: string; group: string; family: string }

function colorScaleTokens(): ManifestToken[] {
  const manifest = new URL(
    '../../packages/core/src/tokens/tokens.json',
    import.meta.url
  )
  let raw: string
  try {
    raw = readFileSync(manifest, 'utf8')
  } catch {
    throw new Error(
      'No token manifest. Run `pnpm --filter @oztix/roadie-core generate:tokens`.'
    )
  }
  const { tokens } = JSON.parse(raw) as { tokens: ManifestToken[] }
  return tokens.filter((token) => token.family === 'color-scales')
}

/** Markdown for each docs component marked `rendered` in `twin-components.ts`, except those the script builds itself. */
export const DATA_RENDERERS: Record<string, Renderer> = {
  DatavizSwatches: ({ kind }) => {
    if (typeof kind !== 'string' || !Object.hasOwn(DATAVIZ_STRIPS, kind))
      throw new Error(`<DatavizSwatches kind="${kind}"> names no dataviz set`)
    return twinTableMarkdown(datavizTable(kind as DatavizKind))
  },
  ScaleSwatches: ({ followingAccent }) =>
    twinTableMarkdown(
      colorScaleTable(colorScales(colorScaleTokens(), followingAccent === true))
    ),
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
