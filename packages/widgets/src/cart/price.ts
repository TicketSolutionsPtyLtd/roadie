import { currencyFormat } from '@oztix/roadie-core/number'

/** How a cart price reads, as text or in NumberFlow: whole amounts keep their decimals. */
export const priceFormat = (currency: string) =>
  currencyFormat({ currency, trailingZeroDisplay: 'auto' })
