export type CurrencyFormatOptions = {
  /** An ISO 4217 code. Dollars read as `$`; in `en-AU`, any other code names itself. @default 'AUD' */
  currency?: string
  /** Decimal places. @default the currency's own, 2 for dollars */
  decimals?: number
  /** Drops the decimals from a whole amount: $1,200 instead of $1,200.00. @default true */
  trimZeros?: boolean
  /** Short form with at most one decimal place. Intl capitalises the suffix: $1.2M, not formatValue's $1.2m. */
  compact?: boolean
}

// NumberFlow's format prop rejects scientific and engineering notation.
type CurrencyFormat = Intl.NumberFormatOptions & {
  notation?: 'standard' | 'compact'
}

export const HOUSE_CURRENCY = 'AUD'
const MAX_INTL_DECIMALS = 20
const minorUnits = new Map<string, number | null>()

function currencyMinorUnits(code: string) {
  if (!minorUnits.has(code))
    try {
      minorUnits.set(
        code,
        new Intl.NumberFormat('en-AU', {
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
 * whole amounts, and the compact form. A code that isn't three letters
 * reads as dollars.
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

export const isHouseCurrency = (code: string) =>
  currencyFormat({ currency: code }).currency === HOUSE_CURRENCY
