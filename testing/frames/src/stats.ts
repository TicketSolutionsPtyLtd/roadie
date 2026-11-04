export const FRAME_MS = 1000 / 60

/** Fewer frames than this can't separate a slow interaction from one hiccup. */
export const MIN_FRAMES = 60

export type Engine = 'chromium' | 'webkit' | 'firefox'

export type FrameStats = {
  frames: number
  p50: number
  p95: number
  worst: number
  /** Vsyncs that passed without a new frame. */
  dropped: number
  /** Dropped vsyncs as a share of all the vsyncs the run spanned. */
  droppedShare: number
}

export type FrameBudget = {
  p95: number
  droppedShare: number
  /** The longest long task allowed, in ms. Unchecked unless set. */
  longestTask?: number
}

const tenths = (ms: number) => Math.round(ms * 10) / 10

export function summariseFrames(deltas: readonly number[]): FrameStats {
  const sorted = [...deltas].sort((a, b) => a - b)
  const at = (quantile: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(quantile * sorted.length))] ??
    0
  const dropped = deltas.reduce(
    (sum, delta) => sum + Math.max(0, Math.round(delta / FRAME_MS) - 1),
    0
  )
  return {
    frames: deltas.length,
    p50: tenths(at(0.5)),
    p95: tenths(at(0.95)),
    worst: tenths(sorted.at(-1) ?? 0),
    dropped,
    droppedShare:
      deltas.length === 0
        ? 0
        : Math.round((dropped / (deltas.length + dropped)) * 1000) / 1000
  }
}

// Chromium's frame clock has sub-millisecond ticks that jitter about 16.7ms.
// WebKit's and Firefox's round to whole milliseconds, so a smooth run reads
// 16 to 18 there, and neither can be throttled.
export function defaultBudget(engine: Engine): FrameBudget {
  return engine === 'chromium'
    ? { p95: 17.5, droppedShare: 0.05 }
    : { p95: 20, droppedShare: 0.1 }
}

export function budgetMisses(
  stats: FrameStats & { longestTask: number | null },
  budget: FrameBudget
): string[] {
  const misses: string[] = []
  if (stats.frames < MIN_FRAMES)
    misses.push(`only ${stats.frames} frames, fewer than ${MIN_FRAMES}`)
  if (stats.p95 > budget.p95)
    misses.push(`p95 ${stats.p95}ms is over ${budget.p95}ms`)
  if (stats.droppedShare > budget.droppedShare)
    misses.push(
      `${percent(stats.droppedShare)} of frames dropped, over ${percent(budget.droppedShare)}`
    )
  if (
    budget.longestTask !== undefined &&
    stats.longestTask !== null &&
    stats.longestTask > budget.longestTask
  )
    misses.push(
      `a ${stats.longestTask}ms long task, over ${budget.longestTask}ms`
    )
  return misses
}

const percent = (share: number) => `${Math.round(share * 1000) / 10}%`
