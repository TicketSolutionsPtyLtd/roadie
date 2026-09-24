import { ReferenceDashboard } from '@/components/charts/ReferenceDashboard'

import { createShowDashboard } from '@oztix/roadie-charts/examples'

export const metadata = {
  title: 'Show dashboard',
  description: 'How one show is selling, with pace against similar shows',
  category: 'Examples',
  order: 1,
  wide: true
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const JSX = `<Dashboard>
  <Dashboard.Section title='At a glance' description='Sat 14 Nov, 30 days to go'>
    <DataCard size='full' label='What to do next'>
      <p>GA is carrying the show and VIP is 27 points short of target. Push VIP in the final month.</p>
    </DataCard>
    <StatTile label='Tickets sold' value={1842} delta={{ value: 214 }} context='This week' trend={dailySold} />
    <StatTile label='Sell-through' value={0.77} format='percent' delta={{ value: 9, format: 'points' }} context='Target 85%' trend={sellThrough} reference={{ value: 0.85, label: 'Target' }} />
    <StatTile label='Pace index' value={112} format='index' delta={{ value: 0.12, format: 'percent' }} context='Similar shows = 100' trend={pace} reference={{ value: 100, label: 'Similar shows' }} />
    <StatTile label='Gross revenue' value={118400} format='compactCurrency' delta={{ value: -0.04, format: 'percent' }} context='On last week' trend={revenue} />
  </Dashboard.Section>
  <Dashboard.Section title='Sales'>
    <Chart size='full' label='Sales pace' value={0.61} format='percent' delta={{ value: 9, format: 'points' }} context='Ahead of similar shows. Forecast 96%' table={paceTable} source='Oztix sales. 38 similar shows, last 3 years.'>
      <PacePlot />
    </Chart>
    <DataCard size='md' label='Ticket types' takeaway='VIP is the one to push this month' source='Oztix sales.'>
      <DataTable columns={ticketTypeColumns} rows={ticketTypes} caption='Ticket types' />
    </DataCard>
    <DataCard size='md' label='Where buyers are from' takeaway='Most buyers are within 20km' source='Oztix sales, billing postcodes.'>
      <DataTable columns={suburbColumns} rows={suburbs} caption='Where buyers are from' />
    </DataCard>
  </Dashboard.Section>
</Dashboard>`

export default function ShowDashboardPage() {
  return <ReferenceDashboard spec={createShowDashboard(BASE)} jsx={JSX} />
}
