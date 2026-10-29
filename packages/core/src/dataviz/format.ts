import {
  HOUSE_CURRENCY,
  currencyFormat,
  isHouseCurrency
} from '../number/currency'

export type ValueFormat =
  | 'number'
  | 'compact'
  | 'percent'
  | 'currency'
  | 'compactCurrency'
  | 'points'
  | 'index'
export type GoodWhen = 'up' | 'down' | 'neither'
export type DeltaSentiment = 'good' | 'bad' | 'neutral'

const LOCALE = 'en-AU'
const NOT_AVAILABLE = 'Not available'

const formatters = new Map<string, Intl.NumberFormat>()

function numberFormat(options: Intl.NumberFormatOptions) {
  const key = JSON.stringify(options)
  const cached = formatters.get(key)
  if (cached) return cached
  const formatter = new Intl.NumberFormat(LOCALE, options)
  formatters.set(key, formatter)
  return formatter
}

export function normalizeMinusSign(text: string) {
  return text.replace(/−/g, '-')
}

const number = (value: number, maximumFractionDigits = 1) =>
  numberFormat({ maximumFractionDigits }).format(value)

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

const compactUnit = (abs: number, divisor: number) =>
  roundToOneDecimal(abs / divisor)

function compact(value: number) {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs < 1_000) {
    const rounded = compactUnit(abs, 1)
    // Rounding can carry 999.95 up to the next unit.
    return rounded < 1_000
      ? `${sign}${number(rounded)}`
      : `${sign}${number(compactUnit(abs, 1_000))}k`
  }
  if (abs < 1_000_000) {
    const thousands = compactUnit(abs, 1_000)
    return thousands < 1_000
      ? `${sign}${number(thousands)}k`
      : `${sign}${number(compactUnit(abs, 1_000_000))}m`
  }
  return `${sign}${number(compactUnit(abs, 1_000_000))}m`
}

function currency(value: number, code = HOUSE_CURRENCY) {
  // Firefox before 116 ignores trailingZeroDisplay and would show $1,200.00.
  const decimals = Number.isInteger(value) ? 0 : undefined
  return numberFormat(currencyFormat({ currency: code, decimals })).format(
    value
  )
}

// Intl's compact reads $118.4K; the house suffix is lowercase.
function compactCurrency(value: number, code = HOUSE_CURRENCY) {
  if (Math.abs(value) < 1_000) return currency(value, code)
  if (!isHouseCurrency(code))
    return numberFormat(
      currencyFormat({ currency: code, compact: true })
    ).format(value)
  return `${value < 0 ? '-' : ''}$${compact(Math.abs(value))}`
}

function percent(value: number) {
  const digits = Math.abs(value) < 0.1 && !Number.isInteger(value * 100) ? 1 : 0
  return numberFormat({
    style: 'percent',
    maximumFractionDigits: digits
  }).format(value)
}

const points = (value: number) =>
  `${number(value)} ${Math.abs(value) === 1 ? 'pt' : 'pts'}`

const FORMATTERS: Record<
  ValueFormat,
  (value: number, currencyCode?: string) => string
> = {
  number: (value) => number(value),
  compact,
  percent,
  currency,
  compactCurrency,
  points,
  index: (value) => number(Math.round(value), 0)
}

export function formatValue(value: number, format: ValueFormat = 'number') {
  return formatValueInCurrency(value, format)
}

/** `formatValue`, with money in the given currency. Core only. */
export function formatValueInCurrency(
  value: number,
  format: ValueFormat = 'number',
  currencyCode?: string
) {
  if (!Number.isFinite(value)) return NOT_AVAILABLE
  return normalizeMinusSign(FORMATTERS[format](value, currencyCode))
}

export function formatDelta(value: number, format: ValueFormat = 'number') {
  return formatValue(Math.abs(value), format)
}

export function deltaSentiment(
  change: number,
  goodWhen: GoodWhen = 'up'
): DeltaSentiment {
  if (change === 0 || goodWhen === 'neither' || !Number.isFinite(change))
    return 'neutral'
  return change > 0 === (goodWhen === 'up') ? 'good' : 'bad'
}

const MEANING: Record<DeltaSentiment, string> = {
  good: ', better',
  bad: ', worse',
  neutral: ''
}

function spokenDelta(change: number, format: ValueFormat) {
  if (format !== 'points') return formatDelta(change, format)
  const size = Math.abs(change)
  return `${number(size)} ${size === 1 ? 'point' : 'points'}`
}

export function describeDelta(
  change: number,
  format: ValueFormat = 'number',
  goodWhen: GoodWhen = 'up'
) {
  if (change === 0 || !Number.isFinite(change)) return 'no change'
  const direction = change > 0 ? 'up' : 'down'
  return `${direction} ${spokenDelta(change, format)}${MEANING[deltaSentiment(change, goodWhen)]}`
}
