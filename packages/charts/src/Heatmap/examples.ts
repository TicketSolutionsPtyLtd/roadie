import type { HeatmapProps } from './types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = ['9am', '12pm', '3pm', '6pm', '9pm']
const shape = [
  [4, 8, 10, 18, 12],
  [5, 9, 11, 20, 13],
  [5, 9, 12, 22, 14],
  [6, 10, 14, 30, 22],
  [8, 12, 18, 42, 36],
  [14, 22, 20, 24, 18],
  [12, 18, 16, 14, 8]
]

export const whenFansBuyExample: HeatmapProps = {
  data: WEEKDAYS.flatMap((weekday, r) =>
    HOURS.map((hour, c) => ({ weekday, hour, orders: shape[r]![c]! }))
  ),
  rows: 'weekday',
  columns: 'hour',
  value: 'orders',
  takeaway: 'Fans buy most on Friday evenings'
}

export const sectionPaceExample: HeatmapProps = {
  data: ['Floor', 'Balcony', 'Mezzanine'].flatMap((section, r) =>
    ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, c) => ({
      section,
      week,
      versus: [0.12, 0.05, -0.02, -0.08][(r + c) % 4]!
    }))
  ),
  rows: 'section',
  columns: 'week',
  value: 'versus',
  scale: 'diverging',
  format: 'percent',
  takeaway: 'The floor has slipped behind similar shows'
}
