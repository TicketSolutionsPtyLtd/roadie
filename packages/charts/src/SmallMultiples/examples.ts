import type { SmallMultiplesProps } from './types'

const GATES = ['North gate', 'South gate', 'River entry', 'Accessible entry']
const PEAKS = [300, 220, 140, 40]

export const gatesExample: SmallMultiplesProps = {
  data: GATES.flatMap((gate, g) =>
    Array.from({ length: 12 }, (_, i) => ({
      gate,
      time: `2026-11-14T${String(17 + Math.floor((i * 15) / 60)).padStart(2, '0')}:${String((i * 15) % 60).padStart(2, '0')}`,
      scans: Math.round(PEAKS[g]! * Math.exp(-(((i - 4 - g * 0.5) / 2.4) ** 2)))
    }))
  ),
  by: 'gate',
  chart: { kind: 'bar', x: 'time', y: 'scans', interval: 'hour' },
  takeaway: 'North gate took the rush, so open River entry earlier'
}
