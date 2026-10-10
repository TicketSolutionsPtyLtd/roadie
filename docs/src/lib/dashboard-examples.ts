import {
  createAudienceDashboard,
  createPortfolioDashboard,
  createShowDashboard
} from '@oztix/roadie-charts/examples'
import type { DashboardSpec } from '@oztix/roadie-core/dashboard'

export type DashboardExample = {
  create: () => DashboardSpec
  /** The dashboard written as components. */
  jsx: string
  /** How the page changes the period: a sentence and the code. */
  period?: { note: string; code: string }
  cardActionsCode?: string
}

/** The reference dashboards' specs and code, shared by their pages and markdown twins. */
export const DASHBOARD_EXAMPLES = {
  show: {
    create: createShowDashboard,
    jsx: `<Dashboard>
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
</Dashboard>`,
    cardActionsCode: `import { cardTable } from '@oztix/roadie-charts/tables'

<DashboardView
  spec={spec}
  cardActions={(card) => (
    <CardMenu label={card.label} table={cardTable(card)} />
  )}
/>`
  },
  portfolio: {
    create: createPortfolioDashboard,
    jsx: `<Dashboard>
  <DashboardPeriod value={period} onValueChange={setPeriod} presets={dateRangePresets} today='2026-10-15' timeZone='Australia/Melbourne' dataStart='2026-07-20' dataEnd='2026-10-15' />
  <Dashboard.Section title='At a glance'>
    <DataCard size='full' label='What to do next'>
      <p>Julia Jacklin and Genesis Owusu are furthest behind similar shows. Julia Jacklin plays first, so start there.</p>
    </DataCard>
    <StatTile label='Tickets sold' value={2531} delta={{ value: 0.04, format: 'percent' }} context='vs previous period' trend={soldEachDay} />
    <StatTile label='Gross revenue' value={185248} format='compactCurrency' delta={{ value: 0.1, format: 'percent' }} context='vs previous period' trend={grossEachDay} />
    <StatTile label='Shows behind' value={3} delta={{ value: 1, goodWhen: 'down' }} context='Of 7 on sale' trend={behindTrend} />
    <StatTile label='Refund rate' value={0.012} format='percent' delta={{ value: -0.3, format: 'points', goodWhen: 'down' }} context='vs previous period' trend={refundsEachDay} />
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
</Dashboard>`,
    period: {
      note: 'Each period’s numbers come from daily sales, as an app would fetch them. Sales start on 20 July, when the first show went on sale, so a year back there is nothing to compare. The As data section shows the default period.',
      code: `'use client'
    
    function PortfolioDashboard() {
      const [period, setPeriod] = useState<PortfolioPeriod>()
      return (
        <DashboardView
          spec={createPortfolioDashboard(period)}
          onPeriodChange={setPeriod}
          periodProps={{ ...portfolioDates, presets: dateRangePresets }}
        />
      )
    }`
    }
  },
  audience: {
    create: createAudienceDashboard,
    jsx: `<Dashboard>
  <Dashboard.Section title='Buyers' description='Sat 5 Dec, 1,300 capacity'>
    <StatTile label='Buyers' value={612} delta={{ value: 177 }} context='In the final week' />
    <StatTile label='New to the venue' value={0.58} format='percent' delta={{ value: 6, format: 'points' }} context='Of buyers' />
    <StatTile label='Tickets per order' value={2.1} context='2.3 at similar shows' />
    <StatTile label='Median lead time' value='12 days' context='19 at similar shows' />
    <Chart size='md' label='Age and gender' takeaway='Women aged 25 to 34 are the biggest group' source='Oztix accounts, where buyers shared it.'>
      <StackedBars data={ages} x='age' y='buyers' series='gender' />
    </Chart>
    <Chart size='md' label='Checkout' takeaway='Most visitors leave before choosing tickets' source='Oztix checkout events.'>
      <Funnel steps={checkout} />
    </Chart>
    <Chart size='md' label='Booking lead time' takeaway='Half of buyers book within two weeks of the show' source='Oztix sales.'>
      <Histogram data={orders} x='days' binWidth={7} median />
    </Chart>
    <Chart size='md' label='Where buyers live' takeaway='Most buyers live within 5km of the venue' source='Oztix sales, billing postcodes.'>
      <RankedBars data={suburbs} x='suburb' y='buyers' share limit={5} />
    </Chart>
  </Dashboard.Section>
</Dashboard>`
  }
} satisfies Record<string, DashboardExample>
