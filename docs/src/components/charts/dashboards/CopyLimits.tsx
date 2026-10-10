import { ProseTable } from '@/components/date-and-time/ReadsTable'

import {
  CHART_LABEL_LIMITS,
  COPY_LIMITS,
  type CardSize
} from '@oztix/roadie-core/dashboard-layout'

const LIMIT_SIZES: CardSize[] = ['stat', 'md']

const CHART_LABEL_SIZES: (keyof typeof CHART_LABEL_LIMITS)[] = [
  'sm',
  'md',
  'lg',
  'full'
]

/** Label and context lengths for stat and `md` cards, from `COPY_LIMITS`. */
export function CopyLimits() {
  return (
    <ProseTable slot='copy-limits' head={['Size', 'Label', 'Context']}>
      {LIMIT_SIZES.map((size) => (
        <tr key={size}>
          <td>
            <code>{size}</code>
          </td>
          <td>{COPY_LIMITS[size].label} characters</td>
          <td>{COPY_LIMITS[size].context} characters</td>
        </tr>
      ))}
    </ProseTable>
  )
}

/** Chart card label lengths at each size, from `CHART_LABEL_LIMITS`. */
export function ChartLabelLimits() {
  return (
    <ProseTable slot='chart-label-limits' head={['Size', 'Label']}>
      {CHART_LABEL_SIZES.map((size) => (
        <tr key={size}>
          <td>
            <code>{size}</code>
          </td>
          <td>{CHART_LABEL_LIMITS[size]} characters</td>
        </tr>
      ))}
    </ProseTable>
  )
}
