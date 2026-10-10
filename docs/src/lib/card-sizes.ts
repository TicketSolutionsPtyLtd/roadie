import {
  CARD_SIZES,
  CARD_SPANS,
  type CardSize,
  DASHBOARD_TRACKS,
  DASHBOARD_WIDTHS,
  type DashboardWidth
} from '@oztix/roadie-core/dashboard-layout'

export const WIDTH_NAME: Record<DashboardWidth, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  phone: 'Phone'
}

const SIZE_USE: Record<CardSize, string> = {
  stat: 'Stat tiles',
  sm: 'Ranked list, small chart',
  md: 'Chart, table',
  lg: 'Main chart',
  full: 'Heatmap, wide table'
}

/** Each card size's span at each width and what it's for, for the page's table and its markdown twin. */
export function cardSizeTable() {
  return {
    head: [
      'Size',
      ...DASHBOARD_WIDTHS.map(
        (width) => `${WIDTH_NAME[width]} (of ${DASHBOARD_TRACKS[width]})`
      ),
      'Use'
    ],
    rows: CARD_SIZES.map((size) => ({
      size,
      spans: DASHBOARD_WIDTHS.map((width) => CARD_SPANS[size][width]),
      use: SIZE_USE[size]
    }))
  }
}
