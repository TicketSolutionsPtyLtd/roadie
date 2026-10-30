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
  'meter',
  'status'
] as const

export type CardSize = (typeof CARD_SIZES)[number]
export type CardKind = (typeof CARD_KINDS)[number]
export type CardState = (typeof CARD_STATES)[number]
export type ColumnKind = (typeof COLUMN_KINDS)[number]

// Measured at each size's narrowest width. A stat label and every context
// line get one line; other labels get two, with realistic word breaks.
export const COPY_LIMITS: Record<CardSize, { label: number; context: number }> =
  {
    stat: { label: 19, context: 20 },
    sm: { label: 66, context: 34 },
    md: { label: 66, context: 34 },
    lg: { label: 80, context: 39 },
    full: { label: 80, context: 39 }
  }

// Two lines beside the Chart/Table icon switch, measured at each size's
// narrowest width with realistic word breaks.
export const CHART_LABEL_LIMITS: Record<Exclude<CardSize, 'stat'>, number> = {
  sm: 42,
  md: 42,
  lg: 50,
  full: 50
}

// Beside a More button: stat tiles on one line at `stat`, and two lines at the
// rest, measured beside the Chart/Table switch too, so table and note labels
// fit them as well. Not validated, since actions aren't JSON.
export const ACTIONS_LABEL_LIMITS: Record<CardSize, number> = {
  stat: 14,
  sm: 29,
  md: 29,
  lg: 42,
  full: 42
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
