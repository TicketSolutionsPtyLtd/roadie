// Five steps, each holding a fifth of the areas with values. Totals per
// area are skewed, so even steps would leave most areas in the first.
export const LEVELS = [0, 1, 2, 3, 4] as const

/**
 * Where each step after the first starts: the values a fifth, two fifths,
 * three and four fifths of the way through the areas, smallest first.
 */
export function classStarts(values: readonly number[]): number[] {
  if (values.length === 0) return []
  const sorted = values.toSorted((a, b) => a - b)
  return LEVELS.map(
    (level) => sorted[Math.floor((level / LEVELS.length) * sorted.length)]!
  )
}

/** The step a value falls in, from 0 to 4. */
export function levelOf(value: number, starts: readonly number[]): number {
  let level = 0
  for (let i = 1; i < starts.length; i++) if (value >= starts[i]!) level = i
  return level
}

/**
 * Each step's range, from where it starts to the largest value in it, so no
 * two ranges share a value. A step with no values is left out.
 */
export function rangesOf(
  starts: readonly number[],
  values: readonly number[],
  format: (value: number) => string
): { level: number; range: string }[] {
  const ends = starts.map(() => -Infinity)
  for (const value of values) {
    const level = levelOf(value, starts)
    ends[level] = Math.max(ends[level]!, value)
  }
  return starts
    .map((start, level) => ({ level, start, end: ends[level]! }))
    .filter(({ end }) => end !== -Infinity)
    .map(({ level, start, end }) => ({
      level,
      range:
        end === start ? format(start) : `${format(start)} to ${format(end)}`
    }))
    .toReversed()
}
