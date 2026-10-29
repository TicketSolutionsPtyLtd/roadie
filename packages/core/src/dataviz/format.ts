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

export type CurrencyFormatOptions = {
  /** An ISO 4217 code. Dollars read as `$`; any other code names itself. @default 'AUD' */
  currency?: string
  /** Decimal places. @default the currency's own, 2 for dollars */
  decimals?: number
  /** Drops the decimals from a whole amount: $1,200 instead of $1,200.00. @default true */
  trimZeros?: boolean
  /** Short form, such as NZD 1.2M, with at most one decimal place. */
  compact?: boolean
}

// NumberFlow's format prop rejects scientific and engineering notation.
type CurrencyFormat = Intl.NumberFormatOptions & {
  notation?: 'standard' | 'compact'
}

const HOUSE_CURRENCY = 'AUD'
const MAX_INTL_DECIMALS = 20
const minorUnits = new Map<string, number | null>()

function currencyMinorUnits(code: string) {
  if (!minorUnits.has(code))
    try {
      minorUnits.set(
        code,
        new Intl.NumberFormat(LOCALE, {
          style: 'currency',
          currency: code
        }).resolvedOptions().maximumFractionDigits ?? null
      )
    } catch {
      minorUnits.set(code, null)
    }
  return minorUnits.get(code) ?? null
}

/**
 * How money reads, as options for `Intl.NumberFormat` or NumberFlow's
 * `format`, in the caller's locale: the symbol, decimal places, trimmed
 * whole amounts, and the compact form. A code Intl doesn't know reads as
 * dollars.
 */
export function currencyFormat({
  currency = HOUSE_CURRENCY,
  decimals,
  trimZeros = true,
  compact = false
}: CurrencyFormatOptions = {}): CurrencyFormat {
  const requested =
    typeof currency === 'string' ? currency.toUpperCase() : HOUSE_CURRENCY
  const units = currencyMinorUnits(requested)
  const code = units === null ? HOUSE_CURRENCY : requested
  const symbol: CurrencyFormat = {
    style: 'currency',
    currency: code,
    currencyDisplay: code === HOUSE_CURRENCY ? 'narrowSymbol' : 'symbol'
  }
  // Older Safari throws when the maximum is under the currency's minimum.
  if (compact)
    return {
      ...symbol,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }
  const places =
    decimals !== undefined && Number.isFinite(decimals)
      ? Math.min(Math.max(Math.round(decimals), 0), MAX_INTL_DECIMALS)
      : (units ?? 2)
  return {
    ...symbol,
    minimumFractionDigits: places,
    maximumFractionDigits: places,
    trailingZeroDisplay: trimZeros ? 'stripIfInteger' : 'auto'
  }
}

const isHouseCurrency = (code: string) =>
  currencyFormat({ currency: code }).currency === HOUSE_CURRENCY

// Firefox before 116 ignores trailingZeroDisplay and would show $1,200.00.
let intlStripsWholeAmounts: boolean | undefined
const stripsWholeAmounts = () =>
  (intlStripsWholeAmounts ??=
    numberFormat({
      minimumFractionDigits: 2,
      trailingZeroDisplay: 'stripIfInteger'
    }).format(1) === '1')

function currency(value: number, code = HOUSE_CURRENCY) {
  const decimals =
    Number.isInteger(value) && !stripsWholeAmounts() ? 0 : undefined
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
