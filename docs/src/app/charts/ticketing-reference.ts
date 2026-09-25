export type TicketingQuestion = {
  question: string
  term: string
  chart: string
}

export const TICKETING_REFERENCE: readonly TicketingQuestion[] = [
  {
    question: 'Is the show selling on pace?',
    term: 'Pace index',
    chart: 'LineChart with band, median, forecast, target and today'
  },
  {
    question: 'How many have sold, and when?',
    term: 'Sales to date, daily orders',
    chart: 'LineChart (cumulative), BarChart by day'
  },
  {
    question: 'What moved sales?',
    term: 'Announcements, line-up drops, email sends, ad bursts, price releases',
    chart: 'Annotations on any time chart'
  },
  {
    question: 'How did the on-sale go?',
    term: 'On-sale spike',
    chart: 'BarChart by hour, annotated'
  },
  {
    question: 'Which ticket types are selling?',
    term: 'Ticket type mix',
    chart: 'StackedBars using the pair or trio sets'
  },
  {
    question: 'How much sold before general sale?',
    term: 'Presale and general',
    chart: 'StackedBars'
  },
  {
    question: 'Where did buyers come from?',
    term: 'Channel, referrer, campaign',
    chart: 'RankedBars'
  },
  {
    question: 'Where do buyers live?',
    term: 'Postcode, region, travel distance',
    chart: 'RankedBars with share'
  },
  {
    question: 'Who are the buyers?',
    term: 'Age and gender brackets, new and returning',
    chart: 'RankedBars or StackedBars'
  },
  {
    question: 'How far ahead do fans buy?',
    term: 'Booking lead time',
    chart: 'Histogram'
  },
  {
    question: 'How many tickets per order?',
    term: 'Order size',
    chart: 'Histogram'
  },
  {
    question: 'Where do buyers drop out?',
    term: 'Checkout conversion, waitlist to purchase',
    chart: 'Funnel'
  },
  {
    question: 'When do fans buy?',
    term: 'Orders by hour and weekday, venue timezone',
    chart: 'Heatmap'
  },
  {
    question: 'Which sections are filling?',
    term: 'Sell-through by section or zone',
    chart: 'Heatmap, or a table of meters'
  },
  {
    question: 'Is there unmet demand?',
    term: 'Sell-out time by release, waitlist sign-ups, abandoned checkouts',
    chart: 'BarChart with annotations, Funnel'
  },
  {
    question: 'How do buyers respond to price?',
    term: 'Sales by price tier, jumps at each price release',
    chart: 'RankedBars, annotated BarChart'
  },
  {
    question: 'What else do our buyers go to?',
    term: 'Also bought',
    chart: 'RankedBars'
  },
  {
    question: 'How are all my shows tracking?',
    term: 'Portfolio pace against sell-through',
    chart: 'Scatter with quadrants'
  },
  {
    question: 'How did entry go?',
    term: 'Scan rate per 15 minutes, share of fans inside',
    chart: 'BarChart with line, SmallMultiples per gate'
  },
  {
    question: 'Did people turn up?',
    term: 'Attendance against sold, no-show rate',
    chart: 'RankedBars with reference (similar shows)'
  },
  {
    question: 'How good was the forecast?',
    term: 'Forecast against actual',
    chart: 'LineChart'
  },
  {
    question: 'How much was resold?',
    term: 'Resale share',
    chart: 'StackedBars'
  }
]
