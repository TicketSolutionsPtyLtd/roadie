import { finiteOrNull } from '../plot/values'
import type { HistogramProps } from './types'

export type Bin = {
  from: number
  to: number
  count: number
  index: number
  /** Whole-number data, where a bin holds the integers from `from` to `to - 1`. */
  whole: boolean
}

const MIN_BINS = 5
const DEFAULT_MAX_BINS = 20
// The schema's own ceiling on `bins`, which also caps a tiny `binWidth`.
export const MAX_BINS = 50
const NICE_STEPS = [1, 2, 2.5, 5, 10]

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
  Math.min(DEFAULT_MAX_BINS, Math.max(MIN_BINS, Math.ceil(Math.log2(size)) + 1))

// Floating point steps leave edges like 0.30000000000000004.
const tidy = (value: number) => Number(value.toPrecision(12))

/** The smallest round width at least `raw`, whole when the data is. */
function niceWidth(raw: number, whole: boolean) {
  if (!(raw > 0)) return 1
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const fits = (width: number) =>
    width >= raw && (!whole || Number.isInteger(width))
  const step = NICE_STEPS.find((s) => fits(s * magnitude)) ?? 20
  return tidy(step * magnitude)
}

const binCount = (min: number, max: number, width: number) =>
  Math.floor(max / width) - Math.floor(min / width) + 1

// Bins are closed on the left, so a value on an edge starts the next bin.
export function binValues(
  values: readonly number[],
  { bins, binWidth }: { bins?: number; binWidth?: number }
): Bin[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const whole = values.every(Number.isInteger)
  let width =
    binWidth !== undefined && binWidth > 0
      ? whole
        ? Math.max(1, Math.ceil(binWidth))
        : binWidth
      : niceWidth((max - min) / (bins ?? defaultBinCount(values.length)), whole)
  while (binCount(min, max, width) > MAX_BINS)
    width = niceWidth(width * 1.01, whole)
  const start = tidy(Math.floor(min / width) * width)
  const count = binCount(min, max, width)
  const result: Bin[] = Array.from({ length: count }, (_, index) => ({
    from: tidy(start + index * width),
    to: tidy(start + (index + 1) * width),
    count: 0,
    index,
    whole
  }))
  for (const value of values) {
    const i = Math.min(
      count - 1,
      Math.max(0, Math.floor((value - start) / width))
    )
    result[i]!.count += 1
  }
  return result
}
