import type { StackedAreaProps } from './types'

const GATES = ['Main gate', 'North gate', 'VIP', 'Box office']

// Scans per 15 minutes from 6pm, peaking as the headliner nears.
export const scansByGateExample: StackedAreaProps = {
  data: Array.from({ length: 16 }, (_, i) => {
    const at = `2026-11-14T${String(18 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`
    const crowd = Math.round(120 * Math.sin((Math.PI * (i + 1)) / 17))
    return GATES.map((gate, g) => ({
      at,
      gate,
      scans: Math.round(crowd * [0.5, 0.3, 0.12, 0.08][g]!)
    }))
  }).flat(),
  x: 'at',
  y: 'scans',
  series: 'gate',
  takeaway: 'Entry peaked around 8pm, mostly through the main gate'
}
