import { type ValueFormat, formatValue } from '@oztix/roadie-core/dataviz'

export const COMPACT_FROM = 10_000
const STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

export const finiteOrNull = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

// An even end keeps the middle gridline on a whole number.
function niceCeil(value: number, whole: boolean) {
  if (value <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const fits = (top: number) => top >= value && (!whole || top % 2 === 0)
  const step = STEPS.find((s) => fits(s * magnitude)) ?? 20
  return step * magnitude
}

const COUNT_FORMATS: readonly (ValueFormat | undefined)[] = [
  undefined,
  'number',
  'compact'
]

/** Whole numbers in a count format, whose gridlines should be whole too. */
export const isCountAxis = (
  values: readonly number[],
  format: ValueFormat | undefined
) => COUNT_FORMATS.includes(format) && values.every(Number.isInteger)

export function valueDomain(
  values: readonly (number | null)[],
  {
    zero = true,
    nice = true,
    format
  }: { zero?: boolean; nice?: boolean; format?: ValueFormat } = {}
): [number, number] {
  const finite = values.filter(
    (v): v is number => v !== null && Number.isFinite(v)
  )
  const whole = nice && isCountAxis(finite, format)
  if (finite.length === 0) return [0, 1]
  const min = Math.min(...finite, ...(zero ? [0] : []))
  const max = Math.max(...finite, ...(zero ? [0] : []))
  const round = nice
    ? (value: number) => niceCeil(value, whole)
    : (value: number) => value
  const top = max > 0 ? round(max) : 0
  const bottom = min < 0 ? -round(-min) : min
  if (top !== bottom) return [bottom, top]
  return [bottom, bottom + (whole ? 2 : 1)]
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
