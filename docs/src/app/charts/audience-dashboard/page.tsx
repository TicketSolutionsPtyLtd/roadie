import { ReferenceDashboard } from '@/components/charts/ReferenceDashboard'
import { DASHBOARD_EXAMPLES } from '@/lib/dashboard-examples'

export const metadata = {
  title: 'Audience dashboard',
  dashboardExample: 'audience',
  description:
    'Who is buying, where they live and how they get through checkout',
  category: 'Examples',
  order: 3,
  wide: true
}

export default function AudienceDashboardPage() {
  const example = DASHBOARD_EXAMPLES.audience
  return <ReferenceDashboard spec={example.create()} jsx={example.jsx} />
}
