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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey // fail-safe: malformed key
  const y = Number(dateKey.slice(0, 4))
  const m = Number(dateKey.slice(5, 7))
  const d = Number(dateKey.slice(8, 10))
  const date = new Date(y, m - 1, d) // local; no UTC shift
  // Reject out-of-range keys that JS Date would silently roll over.
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return dateKey
  }
  return new Intl.DateTimeFormat(opts.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}
