import { ReferenceDashboard } from '@/components/charts/ReferenceDashboard'

import { createPortfolioDashboard } from '@oztix/roadie-charts/examples'

export const metadata = {
  title: 'Portfolio dashboard',
  description: "How a promoter's upcoming shows are selling",
  category: 'Examples',
  order: 2,
  wide: true
}

const JSX = `<Dashboard>
  <Dashboard.Section title='This month'>
    <DataCard size='full' label='What to do next'>
      <p>Julia Jacklin and Genesis Owusu are furthest behind similar shows. Julia Jacklin plays first, so start there.</p>
    </DataCard>
    <StatTile label='Sold, last 30 days' value={2531} delta={{ value: 0.04, format: 'percent' }} context='On previous 30 days' trend={soldEachDay} />
    <StatTile label='Gross revenue' value={447700} format='compactCurrency' delta={{ value: 0.05, format: 'percent' }} context='On last month' trend={grossTrend} />
    <StatTile label='Shows behind' value={3} delta={{ value: 1, goodWhen: 'down' }} context='Of 7 on sale' trend={behindTrend} />
    <StatTile label='Refund rate' value={0.012} format='percent' delta={{ value: -0.3, format: 'points', goodWhen: 'down' }} context='On last month' trend={refundsTrend} />
  </Dashboard.Section>
  <Dashboard.Section title='On sale'>
    <DataCard size='full' label='Upcoming shows' takeaway='Three shows are behind similar shows' source='Oztix sales. Pace against 38 similar shows.'>
      <DataTable columns={showColumns} rows={shows} caption='Upcoming shows' />
    </DataCard>
  </Dashboard.Section>
  <Dashboard.Section title='Pace'>
    <Chart size='full' label='Julia Jacklin pace' value={0.4} format='percent' delta={{ value: -12, format: 'points' }} context='Behind similar shows. Forecast 74%' source='Oztix sales. 38 similar shows, last 3 years.'>
      <LineChart data={juliaPace} x='day' y='sold' format='percent' takeaway='Julia Jacklin tracks below similar shows and is forecast to reach 74%' band={{ low: 'low', high: 'high', median: 'median', label: 'Similar shows' }} forecast={{ from: today, low: 'coneLow', high: 'coneHigh' }} target={0.85} today={today} />
    </Chart>
    <Chart size='full' label='Pace against sell-through' takeaway='Julia Jacklin and Genesis Owusu are behind on pace and sales' source='Oztix sales. Pace against 38 similar shows.'>
      <Scatter data={showPace} x='pace' y='sold' xFormat='index' format='percent' size='capacity' label='show' highlight={['Julia Jacklin', 'Genesis Owusu']} quadrants={{ x: 100, y: 0.5, labels: { topLeft: 'Sold, slowing', topRight: 'On a roll', bottomLeft: 'Needs a push', bottomRight: 'Catching up' } }} />
    </Chart>
  </Dashboard.Section>
</Dashboard>`

export default function PortfolioDashboardPage() {
  return <ReferenceDashboard spec={createPortfolioDashboard()} jsx={JSX} />
}
