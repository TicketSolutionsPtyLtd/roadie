'use client'

import { useState } from 'react'

import { DashboardView } from '@oztix/roadie-charts/dashboard-view'
import {
  type PortfolioPeriod,
  createPortfolioDashboard,
  portfolioDates
} from '@oztix/roadie-charts/examples'
import { dateRangePresets } from '@oztix/roadie-components/date-range-picker'

export function PortfolioDashboardView() {
  const [period, setPeriod] = useState<PortfolioPeriod>()
  return (
    <DashboardView
      spec={createPortfolioDashboard(period)}
      onPeriodChange={setPeriod}
      periodProps={{ ...portfolioDates, presets: dateRangePresets }}
    />
  )
}
