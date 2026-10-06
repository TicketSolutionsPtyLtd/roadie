/** A copy of `data` with `rows` placed from `start`, for range loading; gaps stay undefined. */
export function placeRange<Row>(
  data: readonly (Row | undefined)[],
  start: number,
  rows: readonly Row[]
): (Row | undefined)[] {
  const next = Array.from<Row | undefined>({
    length: Math.max(data.length, start + rows.length)
  })
  data.forEach((row, index) => {
    next[index] = row
  })
  rows.forEach((row, offset) => {
    next[start + offset] = row
  })
  return next
}
