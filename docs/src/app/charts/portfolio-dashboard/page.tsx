import { PortfolioDashboardView } from '@/components/charts/PortfolioDashboardView'
import { ReferenceDashboard } from '@/components/charts/ReferenceDashboard'
import { DASHBOARD_EXAMPLES } from '@/lib/dashboard-examples'

export const metadata = {
  title: 'Portfolio dashboard',
  dashboardExample: 'portfolio',
  description: "How a promoter's upcoming shows are selling",
  category: 'Examples',
  order: 2,
  wide: true
}

const example = DASHBOARD_EXAMPLES.portfolio

export default function PortfolioDashboardPage() {
  return (
    <ReferenceDashboard
      spec={example.create()}
      jsx={example.jsx}
      view={<PortfolioDashboardView />}
      period={example.period}
    />
  )
}
