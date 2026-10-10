import { ProseTable } from '@/components/date-and-time/ReadsTable'

import {
  CARD_SIZES,
  CARD_SPANS,
  type CardSize,
  DASHBOARD_TRACKS,
  DASHBOARD_WIDTHS
} from '@oztix/roadie-core/dashboard-layout'

import { WIDTH_NAME } from './RowDiagram'

const SIZE_USE: Record<CardSize, string> = {
  stat: 'Stat tiles',
  sm: 'Ranked list, small chart',
  md: 'Chart, table',
  lg: 'Main chart',
  full: 'Heatmap, wide table'
}

/** Each card size's span at each width, from `CARD_SPANS`. */
export function CardSizes() {
  return (
    <ProseTable
      slot='card-sizes'
      head={[
        'Size',
        ...DASHBOARD_WIDTHS.map(
          (width) => `${WIDTH_NAME[width]} (of ${DASHBOARD_TRACKS[width]})`
        ),
        'Use'
      ]}
    >
      {CARD_SIZES.map((size) => (
        <tr key={size}>
          <td>
            <code>{size}</code>
          </td>
          {DASHBOARD_WIDTHS.map((width) => (
            <td key={width}>{CARD_SPANS[size][width]}</td>
          ))}
          <td>{SIZE_USE[size]}</td>
        </tr>
      ))}
    </ProseTable>
  )
}
