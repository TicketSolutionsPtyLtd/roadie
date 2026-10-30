import { DONUT_PART_CAP } from '@oztix/roadie-core/dashboard-layout'

import { OTHER } from '../plot/series'
import type { DonutChartProps } from './types'

export const LABEL_MIN_SHARE = 0.03

export type DonutPart = {
  name: string
  value: number
  share: number
  /** A whole percent; a chart's percents add up to 100. */
  percent: number
  /** Whether the slice carries its percent; the smallest don't. */
  labelled: boolean
  isOther: boolean
}

declare const process: { env?: { NODE_ENV?: string } } | undefined

const warned = new Set<string>()

function warnLeftOut(name: string, field: string) {
  if (typeof process === 'undefined' || process?.env?.NODE_ENV === 'production')
    return
  const message = `Roadie chart: the donut leaves out a "${name}" row, since its ${field} isn't a positive number`
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message)
}

/** Every part with a positive total, largest first, before any roll into Other. */
export function partTotals({ data, x, y }: DonutChartProps) {
  const totals = new Map<string, number>()
  for (const row of data) {
    const name = row[x] == null ? '' : String(row[x])
    if (name === '') continue
    const value = row[y]
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
      totals.set(name, (totals.get(name) ?? 0) + value)
    else warnLeftOut(name, y)
  }
  return [...totals]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
}

// Largest remainder, so the labels on one ring always add up to 100%.
function wholePercents(shares: readonly number[]) {
  const exact = shares.map((share) => share * 100)
  const percents = exact.map(Math.floor)
  const short = 100 - percents.reduce((sum, p) => sum + p, 0)
  const byRemainder = exact
    .map((value, i) => ({ i, remainder: value - percents[i]! }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i)
  for (const { i } of byRemainder.slice(0, short)) percents[i]! += 1
  return percents
}

/** The slices in ring order: largest first, then Other, which also takes a part named Other. */
export function donutParts(props: DonutChartProps): DonutPart[] {
  const totals = partTotals(props)
  const sorted = totals.filter(([name]) => name !== OTHER)
  const given = totals.find(([name]) => name === OTHER)?.[1] ?? 0
  const rolled = totals.length > DONUT_PART_CAP
  const named = rolled ? sorted.slice(0, DONUT_PART_CAP - 1) : sorted
  const rest = sorted
    .slice(named.length)
    .reduce((sum, [, value]) => sum + value, given)
  const slices = [
    ...named.map(([name, value]) => ({ name, value, isOther: false })),
    ...(rest > 0 ? [{ name: OTHER, value: rest, isOther: true }] : [])
  ]
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const shares = slices.map((slice) => slice.value / total)
  const percents = wholePercents(shares)
  return slices.map((slice, i) => ({
    ...slice,
    share: shares[i]!,
    percent: percents[i]!,
    labelled: shares[i]! >= LABEL_MIN_SHARE
  }))
}
