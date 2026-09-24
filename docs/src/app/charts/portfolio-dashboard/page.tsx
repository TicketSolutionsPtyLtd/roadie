import { ReferenceDashboard } from '@/components/charts/ReferenceDashboard'

import { createPortfolioDashboard } from '@oztix/roadie-charts/examples'

export const metadata = {
  title: 'Portfolio dashboard',
  description: "How a promoter's upcoming shows are selling",
  category: 'Examples',
  order: 2,
  wide: true
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const JSX = `<Dashboard>
  <Dashboard.Section title='This month'>
    <StatTile label='Tickets sold' value={7462} delta={{ value: 0.08, format: 'percent' }} context='On last month' trend={ticketsTrend} />
    <StatTile label='Gross revenue' value={447700} format='compactCurrency' delta={{ value: 0.05, format: 'percent' }} context='On last month' trend={grossTrend} />
    <StatTile label='Shows behind' value={3} delta={{ value: 1, goodWhen: 'down' }} context='Of 7 on sale' />
    <StatTile label='Refund rate' value={0.012} format='percent' delta={{ value: -0.3, format: 'points', goodWhen: 'down' }} context='On last month' trend={refundsTrend} />
  </Dashboard.Section>
  <Dashboard.Section title='Upcoming shows'>
    <DataCard size='full' label='Upcoming shows' takeaway='Three shows are behind similar shows' source='Oztix sales. Pace against 38 similar shows.'>
      <DataTable columns={showColumns} rows={shows} caption='Upcoming shows' />
    </DataCard>
  </Dashboard.Section>
  <Dashboard.Section title='Pace'>
    <Chart size='md' label='Julia Jacklin pace' value={0.4} format='percent' delta={{ value: -12, format: 'points' }} context='Behind similar shows. 74% vs 85%' table={paceTable} source='Oztix sales. 38 similar shows, last 3 years.'>
      <PaceBehindPlot />
    </Chart>
    <DataCard size='md' label='What to do next'>
      <p>Julia Jacklin, Genesis Owusu and Middle Kids are behind. Julia Jacklin has the biggest gap with 30 days to go, so start there.</p>
    </DataCard>
  </Dashboard.Section>
</Dashboard>`

export default function PortfolioDashboardPage() {
  return <ReferenceDashboard spec={createPortfolioDashboard(BASE)} jsx={JSX} />
}
