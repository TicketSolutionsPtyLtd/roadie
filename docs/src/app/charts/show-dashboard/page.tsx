import { ReferenceDashboard } from '@/components/charts/ReferenceDashboard'

import { createShowDashboard } from '@oztix/roadie-charts/examples'
import { DataCard } from '@oztix/roadie-components/data-card'
import type { DashboardCard } from '@oztix/roadie-core/dashboard'

export const metadata = {
  title: 'Show dashboard',
  description: 'How one show is selling, with pace against similar shows',
  category: 'Examples',
  order: 1,
  wide: true
}

const JSX = `<Dashboard>
  <Dashboard.Section title='At a glance' description='Sat 14 Nov, 30 days to go'>
    <DataCard size='full' label='What to do next'>
      <p>GA is carrying the show and VIP is 45 points short of target. Push VIP in the final month.</p>
    </DataCard>
    <StatTile label='Tickets sold' value={1464} delta={{ value: 216 }} context='This week, of 2,400' trend={dailySold} />
    <StatTile label='Sell-through' value={0.61} format='percent' delta={{ value: 9, format: 'points' }} context='Target 85%' trend={sellThrough} reference={{ value: 0.85, label: 'Target' }} />
    <StatTile label='Pace index' value={112} format='index' delta={{ value: 0.12, format: 'percent' }} context='Similar shows = 100' trend={pace} reference={{ value: 100, label: 'Similar shows' }} />
    <StatTile label='Gross revenue' value={118400} format='compactCurrency' delta={{ value: 0.09, format: 'percent' }} context='On last week' trend={revenue} />
  </Dashboard.Section>
  <Dashboard.Section title='Sales'>
    <Chart size='full' label='Sales pace' value={0.61} format='percent' delta={{ value: 9, format: 'points' }} context='Ahead of similar shows. Forecast 96%' source='Oztix sales. 38 similar shows, last 3 years.'>
      <LineChart data={salesPace} x='day' y='sold' format='percent' takeaway='Tracking ahead of similar shows, forecast to reach 96%' band={{ low: 'low', high: 'high', median: 'median', label: 'Similar shows' }} forecast={{ from: today, low: 'coneLow', high: 'coneHigh' }} target={0.85} today={today} annotations={[{ at: '2026-09-05', label: 'Line-up drop' }]} />
    </Chart>
    <DataCard size='md' label='Ticket types' takeaway='VIP is the one to push this month' source='Oztix sales.'>
      <DataTable columns={ticketTypeColumns} rows={ticketTypes} caption='Ticket types' />
    </DataCard>
    <DataCard size='md' label='Where buyers are from' takeaway='Most buyers are within 20km' source='Oztix sales, billing postcodes.'>
      <DataTable columns={suburbColumns} rows={suburbs} caption='Where buyers are from' />
    </DataCard>
  </Dashboard.Section>
  <Dashboard.Section title='Buyers'>
    <Chart size='md' label='Daily orders' takeaway='Orders peak on Fridays and grow each week' source='Oztix sales.'>
      <BarChart data={dailyOrders} x='day' y='orders' />
    </Chart>
    <Chart size='md' label='Ticket type mix' takeaway='GA is carrying the show' source='Oztix sales.'>
      <StackedBars data={salesByMonth} x='month' y='sold' series='type' />
    </Chart>
    <Chart size='full' label='When fans buy' takeaway='Fans buy most on Friday evenings' source='Oztix sales, venue time.'>
      <Heatmap data={ordersByHour} rows='weekday' columns='hour' value='orders' />
    </Chart>
  </Dashboard.Section>
</Dashboard>`

const CARD_ACTIONS_CODE = `<DashboardView
  spec={spec}
  cardActions={(card) => <DataCard.MoreButton label={card.label} />}
/>`

const moreButton = (card: DashboardCard) => (
  <DataCard.MoreButton label={card.label} />
)

export default function ShowDashboardPage() {
  return (
    <ReferenceDashboard
      spec={createShowDashboard()}
      jsx={JSX}
      cardActions={moreButton}
      cardActionsCode={CARD_ACTIONS_CODE}
    />
  )
}
