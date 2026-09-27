import type { ScatterProps } from './types'

// The shows on sale in examples/portfolioDashboard.ts. Angie McMahon has no
// pace yet, so she is left out. Capacities are invented.
export const portfolioExample: ScatterProps = {
  data: [
    { show: 'Ball Park Music', pace: 112, sold: 0.61, capacity: 2400 },
    { show: 'Ocean Alley', pace: 101, sold: 0.51, capacity: 5000 },
    { show: 'King Stingray', pace: 121, sold: 0.75, capacity: 1200 },
    { show: 'Middle Kids', pace: 94, sold: 0.53, capacity: 1500 },
    { show: 'Julia Jacklin', pace: 78, sold: 0.4, capacity: 800 },
    { show: 'Genesis Owusu', pace: 66, sold: 0.28, capacity: 600 }
  ],
  x: 'pace',
  y: 'sold',
  xFormat: 'index',
  format: 'percent',
  size: 'capacity',
  label: 'show',
  highlight: ['Julia Jacklin', 'Genesis Owusu'],
  quadrants: {
    x: 100,
    y: 0.5,
    labels: {
      topLeft: 'Sold, slowing',
      topRight: 'On a roll',
      bottomLeft: 'Needs a push',
      bottomRight: 'Catching up'
    }
  },
  takeaway: 'Julia Jacklin and Genesis Owusu are behind on pace and sales'
}
