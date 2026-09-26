import { ReferenceDashboard } from '@/components/charts/ReferenceDashboard'

import { createAudienceDashboard } from '@oztix/roadie-charts/examples'

export const metadata = {
  title: 'Audience dashboard',
  description:
    'Who is buying, where they live and how they get through checkout',
  category: 'Examples',
  order: 3,
  wide: true
}

const JSX = `<Dashboard>
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

export default function AudienceDashboardPage() {
  return <ReferenceDashboard spec={createAudienceDashboard()} jsx={JSX} />
}
