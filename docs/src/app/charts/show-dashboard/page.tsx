import { CardMenu } from '@/components/charts/CardMenu'
import { ReferenceDashboard } from '@/components/charts/ReferenceDashboard'
import { DASHBOARD_EXAMPLES } from '@/lib/dashboard-examples'

import { cardTable } from '@oztix/roadie-charts/tables'
import type { DashboardCard } from '@oztix/roadie-core/dashboard'

export const metadata = {
  title: 'Show dashboard',
  dashboardExample: 'show',
  description: 'How one show is selling, with pace against similar shows',
  category: 'Examples',
  order: 1,
  wide: true
}

const cardMenu = (card: DashboardCard) => (
  <CardMenu label={card.label} table={cardTable(card)} />
)

const example = DASHBOARD_EXAMPLES.show

export default function ShowDashboardPage() {
  return (
    <ReferenceDashboard
      spec={example.create()}
      jsx={example.jsx}
      cardActions={cardMenu}
      cardActionsCode={example.cardActionsCode}
    />
  )
}
