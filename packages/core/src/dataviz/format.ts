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

const number = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(value)

function compact(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${number(abs / 1_000_000)}m`
  if (abs >= 1_000) return `${sign}${number(abs / 1_000)}k`
  return `${sign}${number(abs)}`
}

function currency(value: number) {
  const round = Number.isInteger(value)
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'AUD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: round ? 0 : 2,
    maximumFractionDigits: round ? 0 : 2
  })
    .format(value)
    .replace('−', '-')
}

function percent(value: number) {
  const digits = Math.abs(value) < 0.1 && !Number.isInteger(value * 100) ? 1 : 0
  return new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    maximumFractionDigits: digits
  })
    .format(value)
    .replace('−', '-')
}

const points = (value: number) =>
  `${number(value)} ${Math.abs(value) === 1 ? 'pt' : 'pts'}`

const FORMATTERS: Record<ValueFormat, (value: number) => string> = {
  number: (value) => number(value),
  compact,
  percent,
  currency,
  compactCurrency: (value) =>
    Math.abs(value) >= 1_000
      ? `${value < 0 ? '-' : ''}$${compact(Math.abs(value))}`
      : currency(value),
  points,
  index: (value) => number(Math.round(value), 0)
}

export function formatValue(value: number, format: ValueFormat = 'number') {
  if (!Number.isFinite(value)) return NOT_AVAILABLE
  return FORMATTERS[format](value)
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

export function describeDelta(
  change: number,
  format: ValueFormat = 'number',
  goodWhen: GoodWhen = 'up'
) {
  if (change === 0 || !Number.isFinite(change)) return 'no change'
  const direction = change > 0 ? 'up' : 'down'
  return `${direction} ${formatDelta(change, format)}${MEANING[deltaSentiment(change, goodWhen)]}`
}
