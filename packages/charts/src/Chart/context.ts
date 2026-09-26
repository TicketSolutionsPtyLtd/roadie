import { createContext } from 'react'

import type { CardSize } from '@oztix/roadie-core/dashboard-layout'

import type { ChartTable } from '.'

export type ChartReport = { summary: string; table: ChartTable }
export type ChartCardContextValue = {
  /** The smallest plot height for the card size. CSS grows wide plots from it. */
  plotHeight: number
  report: (report: ChartReport | null) => void
  /** The card draws its own legend, so the plot inside adds none. */
  hasLegend: boolean
  /** Puts the card in its error state when the chart inside can't draw. */
  fail: () => void
}

export const PLOT_HEIGHTS: Record<CardSize, number> = {
  stat: 220,
  sm: 160,
  md: 220,
  lg: 260,
  full: 260
}

export const ChartCardContext = createContext<ChartCardContextValue | null>(
  null
)
