export type PillDotProps = {
  /** The most dots to draw at once. */
  max?: number
}

const defaultLabel = (index: number) => `Dot ${index + 1}`

/** The first dot to draw, and how many, to keep `selected` mid-window. */
export function dotWindow(count: number, max?: number) {
  return { start: 0, size: Math.min(count, max ?? count) }
}

export function PillDot(props: PillDotProps) {
  return defaultLabel(dotWindow(3, props.max).size)
}

PillDot.displayName = 'Pill.Dot'
