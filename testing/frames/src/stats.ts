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
  /** The same share with the worst frame set aside, which the budget reads. */
  steadyDroppedShare: number
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
  const missed = (delta: number) =>
    Math.max(0, Math.round(delta / FRAME_MS) - 1)
  const share = (drops: number, frames: number) =>
    frames === 0 ? 0 : Math.round((drops / (frames + drops)) * 1000) / 1000
  const dropped = deltas.reduce((sum, delta) => sum + missed(delta), 0)
  return {
    frames: deltas.length,
    p50: tenths(at(0.5)),
    p95: tenths(at(0.95)),
    worst: tenths(sorted.at(-1) ?? 0),
    dropped,
    droppedShare: share(dropped, deltas.length),
    // One hitch, a collection or the runner stalling, can't fail a run alone.
    steadyDroppedShare: share(
      dropped - missed(sorted.at(-1) ?? 0),
      Math.max(0, deltas.length - 1)
    )
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
  if (stats.steadyDroppedShare > budget.droppedShare)
    misses.push(
      `${percent(stats.steadyDroppedShare)} of frames dropped, over ${percent(budget.droppedShare)}`
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

export type MissMarks = {
  /** The ticket for a miss that's filed rather than fixed. */
  knownMiss?: string
  /** Why a miss is accepted by design and won't be fixed. */
  exception?: string
}

export type RunNote = {
  /** A short remark kept with the run, such as its style time. */
  note?: string
}

/** Why a missed budget doesn't fail the test, if anything excuses it. */
export function missExcuse(
  frames: number,
  { knownMiss, exception }: MissMarks
) {
  // A run too short to judge is a broken test, whatever excuse it gives.
  return frames >= MIN_FRAMES ? exception || knownMiss || undefined : undefined
}

/**
 * The line a local run prints for a run that was excused or carries a note,
 * since neither fails the test and so neither would show otherwise. Its
 * dropped share is the one the budget reads.
 */
export function frameNotice(
  scenario: string,
  stats: Pick<FrameStats, 'frames' | 'p95' | 'steadyDroppedShare'>,
  misses: readonly string[],
  marks: MissMarks & RunNote
) {
  const excuse = missExcuse(stats.frames, marks)
  if (!excuse && !marks.note) return undefined
  const verdict = misses.length ? `Missed (${misses.join(', ')})` : 'Met'
  const excused = !excuse
    ? ''
    : excuse === marks.exception
      ? `, accepted: ${excuse}`
      : `, filed as ${excuse}`
  const note = marks.note ? `. Note: ${marks.note}` : ''
  return `FRAMES ${scenario}: p95 ${stats.p95}ms, ${percent(stats.steadyDroppedShare)} dropped. ${verdict}${excused}${note}`
}

const percent = (share: number) => `${Math.round(share * 1000) / 10}%`
