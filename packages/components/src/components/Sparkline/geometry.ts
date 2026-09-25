export const SPARKLINE_MIN_POINTS = 5
const PADDING = 10

export type SparklineGeometry = {
  points: string
  end: { x: number; y: number }
  referenceY?: number
}

const round = (n: number) => Math.round(n * 100) / 100

export function sparklineGeometry(
  values: readonly number[],
  reference?: number,
  minPoints = SPARKLINE_MIN_POINTS
): SparklineGeometry | null {
  const series = values.filter(Number.isFinite)
  if (series.length < Math.max(2, minPoints)) return null
  const domain = reference === undefined ? series : [...series, reference]
  const low = Math.min(...domain)
  const high = Math.max(...domain)
  const y = (value: number) =>
    high === low
      ? 50
      : round(
          PADDING + (1 - (value - low) / (high - low)) * (100 - PADDING * 2)
        )
  const x = (i: number) => round((i / (series.length - 1)) * 100)
  const coords = series.map((value, i) => ({ x: x(i), y: y(value) }))
  return {
    points: coords.map(({ x, y }) => `${x},${y}`).join(' '),
    end: coords.at(-1)!,
    referenceY: reference === undefined ? undefined : y(reference)
  }
}
