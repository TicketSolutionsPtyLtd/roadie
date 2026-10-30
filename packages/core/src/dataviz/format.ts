import {
  HOUSE_CURRENCY,
  currencyFormat,
  isHouseCurrency
} from '../number/currency'
import {
  type TrailingZeroDisplay,
  decimalPlaces,
  fractionDigits
} from '../number/places'
import { intlFormatter } from '../utils/intlCache'

export type ValueFormat =
  | 'number'
  | 'compact'
  | 'percent'
  | 'currency'
  | 'compactCurrency'
  | 'points'
  | 'index'
export type ValueFormatOptions = {
  /** Fixed decimal places for number, percent, points, and currency, from none to four: 2 reads 1.27% and $3,116.00. A chart's shares follow it, and its axis ticks stay short. Compact formats and index ignore it. @default the currency's own for currency */
  decimals?: number
  /** `stripIfInteger` drops the decimals from a whole value: $3,116 instead of $3,116.00. @default 'auto' */
  trailingZeroDisplay?: TrailingZeroDisplay
}
export type GoodWhen = 'up' | 'down' | 'neither'
export type DeltaSentiment = 'good' | 'bad' | 'neutral'

type FormatterOptions = ValueFormatOptions & { currencyCode?: string }

const LOCALE = 'en-AU'
const NOT_AVAILABLE = 'Not available'

const numberFormat = (options: Intl.NumberFormatOptions) =>
  intlFormatter(Intl.NumberFormat, LOCALE, options)

export function normalizeMinusSign(text: string) {
  return text.replace(/−/g, '-')
}

const number = (value: number, maximumFractionDigits = 1) =>
  numberFormat({ maximumFractionDigits }).format(value)

const plain = (
  value: number,
  { decimals, trailingZeroDisplay }: FormatterOptions
) =>
  decimals === undefined
    ? number(value)
    : numberFormat(fractionDigits(decimals, trailingZeroDisplay)).format(value)

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

function currency(
  value: number,
  { decimals, trailingZeroDisplay, currencyCode }: FormatterOptions
) {
  // Firefox before 116 ignores trailingZeroDisplay and would show $1,200.00.
  const strip = trailingZeroDisplay === 'stripIfInteger'
  return numberFormat(
    currencyFormat({
      currency: currencyCode ?? HOUSE_CURRENCY,
      decimals: strip && Number.isInteger(value) ? 0 : decimals,
      trailingZeroDisplay
    })
  ).format(value)
}

// Intl's compact reads $118.4K; the house suffix is lowercase.
function compactCurrency(value: number, { currencyCode }: FormatterOptions) {
  const code = currencyCode ?? HOUSE_CURRENCY
  if (Math.abs(value) < 1_000)
    return currency(value, {
      currencyCode: code,
      trailingZeroDisplay: 'stripIfInteger'
    })
  if (!isHouseCurrency(code))
    return numberFormat(
      currencyFormat({ currency: code, compact: true })
    ).format(value)
  return `${value < 0 ? '-' : ''}$${compact(Math.abs(value))}`
}

function percent(
  value: number,
  { decimals, trailingZeroDisplay }: FormatterOptions
) {
  if (decimals !== undefined)
    return numberFormat({
      style: 'percent',
      ...fractionDigits(decimals, trailingZeroDisplay)
    }).format(value)
  const digits = Math.abs(value) < 0.1 && !Number.isInteger(value * 100) ? 1 : 0
  return numberFormat({
    style: 'percent',
    maximumFractionDigits: digits
  }).format(value)
}

const readsAsOne = (shown: string) => /^-?1$/.test(shown)

function points(value: number, options: FormatterOptions) {
  const shown = plain(value, options)
  return `${shown} ${readsAsOne(shown) ? 'pt' : 'pts'}`
}

const FORMATTERS: Record<
  ValueFormat,
  (value: number, options: FormatterOptions) => string
> = {
  number: plain,
  compact,
  percent,
  currency,
  compactCurrency,
  points,
  index: (value) => number(Math.round(value), 0)
}

export function formatValue(
  value: number,
  format: ValueFormat = 'number',
  options: ValueFormatOptions = {}
) {
  return formatValueInCurrency(value, format, undefined, options)
}

/** `formatValue`, with money in the given currency. Core only. */
export function formatValueInCurrency(
  value: number,
  format: ValueFormat = 'number',
  currencyCode?: string,
  { decimals, trailingZeroDisplay }: ValueFormatOptions = {}
) {
  if (!Number.isFinite(value)) return NOT_AVAILABLE
  return normalizeMinusSign(
    FORMATTERS[format](value, {
      decimals: decimalPlaces(decimals),
      trailingZeroDisplay,
      currencyCode
    })
  )
}

export function formatDelta(
  value: number,
  format: ValueFormat = 'number',
  options?: ValueFormatOptions
) {
  return formatValue(Math.abs(value), format, options)
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

function spokenDelta(
  change: number,
  format: ValueFormat,
  options?: ValueFormatOptions
) {
  if (format !== 'points') return formatDelta(change, format, options)
  const size = formatValue(Math.abs(change), 'number', options)
  return `${size} ${readsAsOne(size) ? 'point' : 'points'}`
}

export function describeDelta(
  change: number,
  format: ValueFormat = 'number',
  goodWhen: GoodWhen = 'up',
  options?: ValueFormatOptions
) {
  if (change === 0 || !Number.isFinite(change)) return 'no change'
  const direction = change > 0 ? 'up' : 'down'
  return `${direction} ${spokenDelta(change, format, options)}${MEANING[deltaSentiment(change, goodWhen)]}`
}
