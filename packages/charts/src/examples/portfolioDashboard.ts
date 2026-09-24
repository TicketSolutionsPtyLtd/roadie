import type { DashboardSpec } from '@oztix/roadie-core/dashboard'

const shows = [
  {
    show: 'Ball Park Music',
    venue: 'The Lantern Room, Fortitude Valley · Sat 14 Nov',
    daily: [
      22, 30, 28, 41, 38, 52, 47, 55, 61, 58, 66, 72, 70, 81, 79, 92, 88, 96,
      104, 99, 112, 118, 109, 125, 131, 128, 140, 152, 147, 160
    ],
    sellThrough: 0.77,
    pace: 112,
    gross: 118400
  },
  {
    show: 'Ocean Alley',
    venue: 'Parkside Amphitheatre, Geelong · Sat 12 Dec',
    daily: [
      90, 95, 88, 97, 102, 99, 94, 101, 108, 97, 92, 99, 104, 110, 101, 97, 103,
      108, 99, 95, 102, 107, 111, 104, 99, 106, 110, 103, 108, 112
    ],
    sellThrough: 0.51,
    pace: 101,
    gross: 183000
  },
  {
    show: 'King Stingray',
    venue: 'Saltwater Hall, Darwin · Sat 5 Dec',
    daily: [
      12, 15, 19, 17, 22, 26, 24, 29, 33, 31, 36, 40, 38, 44, 47, 45, 51, 55,
      53, 58, 62, 60, 66, 70, 68, 73, 77, 75, 81, 86
    ],
    sellThrough: 0.75,
    pace: 121,
    gross: 61600
  },
  {
    show: 'Middle Kids',
    venue: 'Harbourline Theatre, Newcastle · Sat 21 Nov',
    daily: [
      30, 28, 31, 27, 25, 29, 26, 24, 27, 23, 25, 22, 24, 21, 23, 20, 22, 24,
      21, 19, 22, 20, 18, 21, 19, 17, 20, 18, 16, 19
    ],
    sellThrough: 0.53,
    pace: 94,
    gross: 38200
  },
  {
    show: 'Julia Jacklin',
    venue: 'The Gasworks Room, Hobart · Sat 28 Nov',
    daily: [
      18, 16, 17, 14, 15, 13, 14, 12, 13, 11, 12, 10, 11, 9, 10, 9, 8, 10, 8, 7,
      9, 7, 6, 8, 6, 7, 5, 6, 5, 6
    ],
    sellThrough: 0.46,
    pace: 78,
    gross: 22900
  },
  {
    show: 'Genesis Owusu',
    venue: 'The Velvet Room, Surry Hills · Sat 19 Dec',
    daily: [
      9, 8, 9, 7, 8, 6, 7, 6, 5, 7, 5, 6, 4, 5, 4, 5, 3, 4, 5, 3, 4, 3, 2, 4, 3,
      2, 3, 2, 3, 2
    ],
    sellThrough: 0.28,
    pace: 66,
    gross: 12400
  },
  {
    show: 'Angie McMahon',
    venue: 'The Moth Club, Brunswick · Fri 30 Jan',
    daily: [95, 85],
    sellThrough: 0.18,
    pace: 'On sale 2 days',
    gross: 11200
  }
]

export function createPortfolioDashboard(assetBase = ''): DashboardSpec {
  return {
    version: 1,
    title: 'Riverbend Touring',
    sections: [
      {
        title: 'This month',
        cards: [
          {
            id: 'tickets',
            kind: 'stat',
            size: 'stat',
            label: 'Tickets sold',
            value: 7462,
            delta: { value: 0.08, format: 'percent' },
            context: 'On last month',
            trend: [5200, 5600, 5900, 6100, 6400, 6800, 7100, 7462]
          },
          {
            id: 'gross',
            kind: 'stat',
            size: 'stat',
            label: 'Gross revenue',
            value: 447700,
            format: 'compactCurrency',
            delta: { value: 0.05, format: 'percent' },
            context: 'On last month',
            trend: [
              310000, 330000, 350000, 372000, 391000, 410000, 426000, 447700
            ]
          },
          {
            id: 'behind',
            kind: 'stat',
            size: 'stat',
            label: 'Shows behind',
            value: 3,
            delta: { value: 1, goodWhen: 'down' },
            context: 'Of 7 on sale'
          },
          {
            id: 'refunds',
            kind: 'stat',
            size: 'stat',
            label: 'Refund rate',
            value: 0.012,
            format: 'percent',
            delta: { value: -0.3, format: 'points', goodWhen: 'down' },
            context: 'On last month',
            trend: [0.02, 0.018, 0.017, 0.016, 0.015, 0.014, 0.013, 0.012]
          }
        ]
      },
      {
        title: 'Upcoming shows',
        cards: [
          {
            id: 'shows',
            kind: 'table',
            size: 'full',
            label: 'Upcoming shows',
            takeaway: 'Three shows are behind similar shows',
            columns: [
              {
                key: 'show',
                header: 'Show',
                kind: 'text',
                pin: true,
                secondaryKey: 'venue'
              },
              {
                key: 'daily',
                header: 'Daily sales, 30 days',
                kind: 'sparkline',
                priority: 3
              },
              {
                key: 'sellThrough',
                header: 'Sell-through',
                kind: 'meter',
                target: 0.85,
                priority: 2
              },
              {
                key: 'pace',
                header: 'Pace index',
                kind: 'delta',
                format: 'index',
                baseline: 100
              },
              {
                key: 'gross',
                header: 'Gross',
                kind: 'number',
                format: 'compactCurrency',
                priority: 1
              }
            ],
            rows: shows,
            source: 'Oztix sales. Pace against 38 similar shows.'
          }
        ]
      },
      {
        title: 'Pace',
        cards: [
          {
            id: 'behind-pace',
            kind: 'chart',
            size: 'md',
            label: 'Julia Jacklin pace',
            value: 0.4,
            format: 'percent',
            delta: { value: -12, format: 'points' },
            context: 'Behind similar shows. 74% vs 85% target',
            plot: {
              kind: 'static',
              src: `${assetBase}/charts/pace-behind-light.svg`,
              srcDark: `${assetBase}/charts/pace-behind-dark.svg`,
              alt: 'Julia Jacklin tracks below the band of similar shows and is forecast to reach 74%'
            },
            table: {
              columns: [
                { key: 'days', header: 'Days to show', kind: 'number' },
                {
                  key: 'show',
                  header: 'This show',
                  kind: 'number',
                  format: 'percent'
                },
                {
                  key: 'similar',
                  header: 'Similar shows',
                  kind: 'number',
                  format: 'percent'
                }
              ],
              rows: [
                { days: 90, show: 0.11, similar: 0.14 },
                { days: 60, show: 0.27, similar: 0.35 },
                { days: 30, show: 0.4, similar: 0.52 }
              ]
            },
            source: 'Oztix sales. 38 similar shows, last 3 years.'
          },
          {
            id: 'next',
            kind: 'note',
            size: 'md',
            label: 'What to do next',
            body: 'Julia Jacklin, Genesis Owusu and Middle Kids are behind. Julia Jacklin has the biggest gap with 30 days to go, so start there.'
          }
        ]
      }
    ]
  }
}
