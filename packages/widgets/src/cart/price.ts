import { currencyFormat } from '@oztix/roadie-core/number'

/** How a cart price reads, as text or in NumberFlow: cents on every amount. */
export const priceFormat = (currency: string) =>
  currencyFormat({ currency, trimZeros: false })
