import { finiteOrNull } from '../plot/values'
import type { HistogramProps } from './types'

export type Bin = { from: number; to: number; count: number; index: number }

const MIN_BINS = 5
const MAX_BINS = 20

export function histogramValues(props: Pick<HistogramProps, 'data' | 'x'>) {
  return props.data
    .map((row) => finiteOrNull(row[props.x]))
    .filter((v): v is number => v !== null)
}

export function medianOf(values: readonly number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}

const defaultBinCount = (size: number) =>
  Math.min(MAX_BINS, Math.max(MIN_BINS, Math.ceil(Math.log2(size)) + 1))

// Bins are closed on the left, so a value on an edge starts the next bin.
export function binValues(
  values: readonly number[],
  { bins, binWidth }: { bins?: number; binWidth?: number }
): Bin[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const byWidth = binWidth !== undefined && binWidth > 0
  if (min === max)
    return [
      {
        from: min,
        to: min + (byWidth ? binWidth : 1),
        count: values.length,
        index: 0
      }
    ]
  const count = byWidth
    ? Math.floor(max / binWidth) - Math.floor(min / binWidth) + 1
    : (bins ?? defaultBinCount(values.length))
  const width = byWidth ? binWidth : (max - min) / count
  const start = byWidth ? Math.floor(min / binWidth) * binWidth : min
  const result: Bin[] = Array.from({ length: count }, (_, index) => ({
    from: start + index * width,
    to: start + (index + 1) * width,
    count: 0,
    index
  }))
  for (const value of values) {
    const i = Math.min(count - 1, Math.floor((value - start) / width))
    result[i]!.count += 1
  }
  return result
}
