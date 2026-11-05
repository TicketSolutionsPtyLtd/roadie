/** Intl's own option and values, so they pass straight through. */
export type TrailingZeroDisplay = 'auto' | 'stripIfInteger'

const MAX_DECIMALS = 4

/** From none to four, or undefined when unset or not a finite number. */
export function decimalPlaces(decimals: number | undefined) {
  if (decimals === undefined || !Number.isFinite(decimals)) return undefined
  return Math.min(Math.max(Math.round(decimals), 0), MAX_DECIMALS)
}

export const fractionDigits = (
  places: number,
  trailingZeroDisplay: TrailingZeroDisplay = 'auto'
) => ({
  minimumFractionDigits: places,
  maximumFractionDigits: places,
  trailingZeroDisplay
})
