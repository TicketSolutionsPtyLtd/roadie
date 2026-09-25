import { finiteOrNull } from '../plot/values'
import type { HeatmapProps, HeatmapScale } from './types'

export type HeatCell = {
  row: string
  column: string
  value: number
  step: number
  bucket: string
  index: number
}

const STEPS = 8
const MID = STEPS / 2

const bucketName = (scale: HeatmapScale, step: number) =>
  `${scale === 'diverging' ? 'diverge' : 'heat'}-${step}`

export const heatBuckets = (scale: HeatmapScale) =>
  Array.from({ length: STEPS + 1 }, (_, step) => bucketName(scale, step))

const clampStep = (step: number) => Math.max(0, Math.min(STEPS, step))

// Diverging steps follow paint.diverging: 0 is most ahead (cool), 8 most behind.
const stepFor = (value: number, max: number, scale: HeatmapScale) =>
  scale === 'diverging'
    ? clampStep(MID - Math.round((value / max) * MID))
    : clampStep(Math.round((Math.max(0, value) / max) * STEPS))

export function heatCells(props: HeatmapProps): HeatCell[] {
  const scale = props.scale ?? 'sequential'
  const cells = props.data.flatMap((row, index) => {
    const value = finiteOrNull(row[props.value])
    const cellRow = String(row[props.rows] ?? '')
    const column = String(row[props.columns] ?? '')
    return value === null || cellRow === '' || column === ''
      ? []
      : [{ row: cellRow, column, value, index }]
  })
  const magnitude = (value: number) =>
    scale === 'diverging' ? Math.abs(value) : value
  const max = Math.max(0, ...cells.map((c) => magnitude(c.value))) || 1
  return cells.map((c) => {
    const step = stepFor(c.value, max, scale)
    return { ...c, step, bucket: bucketName(scale, step) }
  })
}

export const firstSeen = (values: readonly string[]) => [...new Set(values)]
