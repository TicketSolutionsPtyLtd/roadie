import { OTHER } from '../plot/series'
import { finiteOrNull } from '../plot/values'
import type { RankedBarsProps } from './types'

export const DEFAULT_LIMIT = 8

export type Ranked = {
  name: string
  value: number
  share: number
  reference: number | null
  isOther: boolean
  index: number
}

type Row = Omit<Ranked, 'share' | 'isOther'>

const sum = (rows: readonly { value: number }[]) =>
  rows.reduce((total, row) => total + row.value, 0)

function rankable(props: RankedBarsProps): Row[] {
  const reference = props.reference?.field
  return props.data
    .map((row, index) => ({
      name: row[props.x] == null ? '' : String(row[props.x]),
      value: finiteOrNull(row[props.y]),
      reference: reference ? finiteOrNull(row[reference]) : null,
      index
    }))
    .filter((r): r is Row => r.value !== null && r.name !== '')
    .sort((a, b) => b.value - a.value)
}

export function rank(props: RankedBarsProps): Ranked[] {
  const rows = rankable(props)
  const total = sum(rows) || 1
  const limit = props.limit ?? DEFAULT_LIMIT
  const toRanked = (row: Row): Ranked => ({
    ...row,
    share: row.value / total,
    isOther: false
  })
  if (rows.length <= limit) return rows.map(toRanked)
  const value = sum(rows.slice(limit - 1))
  return [
    ...rows.slice(0, limit - 1).map(toRanked),
    {
      name: OTHER,
      value,
      share: value / total,
      reference: null,
      isOther: true,
      index: -1
    }
  ]
}
