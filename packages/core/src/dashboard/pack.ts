import type { CardSize } from './schema'

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
