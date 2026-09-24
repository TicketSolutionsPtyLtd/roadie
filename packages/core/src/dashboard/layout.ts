export const CARD_SIZES = ['stat', 'sm', 'md', 'lg', 'full'] as const
export const CARD_KINDS = ['stat', 'table', 'chart', 'note'] as const
export const CARD_STATES = [
  'ready',
  'loading',
  'empty',
  'error',
  'stale'
] as const
export const COLUMN_KINDS = [
  'text',
  'number',
  'delta',
  'sparkline',
  'meter'
] as const

export type CardSize = (typeof CARD_SIZES)[number]
export type CardKind = (typeof CARD_KINDS)[number]
export type CardState = (typeof CARD_STATES)[number]
export type ColumnKind = (typeof COLUMN_KINDS)[number]

export const COPY_LIMITS: Record<CardSize, { label: number; context: number }> =
  {
    stat: { label: 20, context: 20 },
    sm: { label: 35, context: 37 },
    md: { label: 35, context: 37 },
    lg: { label: 40, context: 40 },
    full: { label: 40, context: 40 }
  }

// Tighter than COPY_LIMITS: measured beside the Chart/Table icon switch.
export const CHART_LABEL_LIMITS: Record<Exclude<CardSize, 'stat'>, number> = {
  sm: 21,
  md: 21,
  lg: 27,
  full: 27
}

export const DASHBOARD_WIDTHS = ['desktop', 'tablet', 'phone'] as const
export type DashboardWidth = (typeof DASHBOARD_WIDTHS)[number]

export const DASHBOARD_TRACKS: Record<DashboardWidth, number> = {
  desktop: 12,
  tablet: 6,
  phone: 2
}

export const CARD_SPANS: Record<CardSize, Record<DashboardWidth, number>> = {
  stat: { desktop: 3, tablet: 3, phone: 1 },
  sm: { desktop: 4, tablet: 3, phone: 2 },
  md: { desktop: 6, tablet: 3, phone: 2 },
  lg: { desktop: 8, tablet: 6, phone: 2 },
  full: { desktop: 12, tablet: 6, phone: 2 }
}

export type RowGap = {
  width: DashboardWidth
  row: number
  ids: string[]
  emptyTracks: number
}

function gapsAt(
  width: DashboardWidth,
  cards: readonly { id: string; size: CardSize }[]
) {
  const tracks = DASHBOARD_TRACKS[width]
  const gaps: RowGap[] = []
  let row = 0
  let used = 0
  let ids: string[] = []
  const closeRow = () => {
    if (used > 0 && used < tracks)
      gaps.push({ width, row, ids, emptyTracks: tracks - used })
    row += 1
    used = 0
    ids = []
  }
  for (const card of cards) {
    const span = CARD_SPANS[card.size][width]
    if (used + span > tracks) closeRow()
    used += span
    ids.push(card.id)
    if (used === tracks) closeRow()
  }
  if (used > 0) closeRow()
  return gaps
}

export function findRowGaps(cards: readonly { id: string; size: CardSize }[]) {
  return DASHBOARD_WIDTHS.flatMap((width) => gapsAt(width, cards))
}
