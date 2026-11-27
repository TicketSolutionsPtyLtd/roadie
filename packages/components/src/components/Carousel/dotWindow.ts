/** The first dot to draw, and how many, to keep `selected` mid-window. */
export function dotWindow(count: number, selected: number, max?: number) {
  const size =
    max !== undefined && Number.isFinite(max) && max >= 1
      ? Math.min(Math.floor(max), count)
      : count
  const start = Math.max(
    0,
    Math.min(selected - Math.floor(size / 2), count - size)
  )
  return { start, size }
}
