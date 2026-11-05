import { ProseDataTable } from '@/components/ProseTable'
import { chartLabelLimitsTable, copyLimitsTable } from '@/lib/dashboard-tables'

/** Label and context lengths for stat cards and `md` table and note cards, from `COPY_LIMITS`. */
export function CopyLimits() {
  return <ProseDataTable slot='copy-limits' table={copyLimitsTable()} />
}

/** Chart card label lengths at each size, from `CHART_LABEL_LIMITS`. */
export function ChartLabelLimits() {
  return (
    <ProseDataTable slot='chart-label-limits' table={chartLabelLimitsTable()} />
  )
}
