export interface CurrencyOptions {
  locale: string
  currency: string
}
export interface DateOptions {
  locale: string
}

export function formatCurrency(amount: number, opts: CurrencyOptions): string {
  return amount.toLocaleString(opts.locale, {
    style: 'currency',
    currency: opts.currency
  })
}

/** Format a venue-local YYYY-MM-DD key as a day header (parsed as local date). */
export function formatDayHeader(dateKey: string, opts: DateOptions): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y ?? NaN, (m ?? 1) - 1, d ?? 1) // local; no UTC shift
  if (Number.isNaN(date.getTime())) return dateKey
  return new Intl.DateTimeFormat(opts.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}
