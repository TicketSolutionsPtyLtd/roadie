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
export type RankRow = Omit<Row, 'value'> & { value: number | null }

const sum = (rows: readonly { value: number }[]) =>
  rows.reduce((total, row) => total + row.value, 0)

const addOrNull = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : a + b

const byValue = (a: RankRow, b: RankRow) =>
  a.value === null
    ? b.value === null
      ? 0
      : 1
    : b.value === null
      ? -1
      : b.value - a.value

/** One row per name, largest first. Rows that share a name add up. */
export function rankRows(props: RankedBarsProps): RankRow[] {
  const reference = props.reference?.field
  const rows = new Map<string, RankRow>()
  props.data.forEach((row, index) => {
    const name = row[props.x] == null ? '' : String(row[props.x])
    if (name === '') return
    const value = finiteOrNull(row[props.y])
    const ref = reference ? finiteOrNull(row[reference]) : null
    const seen = rows.get(name)
    rows.set(
      name,
      seen
        ? {
            ...seen,
            value: addOrNull(seen.value, value),
            reference: addOrNull(seen.reference, ref)
          }
        : { name, value, reference: ref, index }
    )
  })
  return [...rows.values()].sort(byValue)
}

const rankable = (props: RankedBarsProps) =>
  rankRows(props).filter((r): r is Row => r.value !== null)

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
