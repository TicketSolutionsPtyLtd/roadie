import { type ValueFormat, formatValue } from '@oztix/roadie-core/dataviz'

export const COMPACT_FROM = 10_000
const STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

export const finiteOrNull = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

function niceCeil(value: number) {
  if (value <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = STEPS.find((s) => s * magnitude >= value) ?? 10
  return step * magnitude
}

export function valueDomain(
  values: readonly (number | null)[],
  { zero = true }: { zero?: boolean } = {}
): [number, number] {
  const finite = values.filter(
    (v): v is number => v !== null && Number.isFinite(v)
  )
  if (finite.length === 0) return [0, 1]
  const min = Math.min(...finite, ...(zero ? [0] : []))
  const max = Math.max(...finite, ...(zero ? [0] : []))
  const top = max > 0 ? niceCeil(max) : 0
  const bottom = min < 0 ? -niceCeil(-min) : min
  return top === bottom ? [bottom, bottom + 1] : [bottom, top]
}

export function gridTicks([low, high]: readonly [number, number]) {
  return [low, (low + high) / 2, high]
}

const COMPACT: Partial<Record<ValueFormat, ValueFormat>> = {
  number: 'compact',
  currency: 'compactCurrency'
}

const shownFormat = (format: ValueFormat | undefined, size: number) => {
  const base = format ?? 'number'
  return Math.abs(size) >= COMPACT_FROM ? (COMPACT[base] ?? base) : base
}

export function axisFormat(format: ValueFormat | undefined, max: number) {
  const shown = shownFormat(format, max)
  return (value: number) => formatValue(value, shown)
}

export const labelFormat = (format: ValueFormat | undefined, value: number) =>
  formatValue(value, shownFormat(format, value))

export function fullFormat(format: ValueFormat | undefined): ValueFormat {
  if (format === 'compact' || format === undefined) return 'number'
  return format === 'compactCurrency' ? 'currency' : format
}
