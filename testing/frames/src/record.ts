import type { Engine, FrameStats } from './stats'

export type FrameReport = FrameStats & {
  engine: Engine
  /** How many times slower Chromium ran the main thread. 1 is unthrottled. */
  cpu: number
  /** Tasks over 50ms. Null where the engine doesn't report them. */
  longTasks: number | null
  longestTask: number | null
  /** Animation frames over 50ms. Null where the engine doesn't report them. */
  longFrames: number | null
  longestFrame: number | null
}

export type FrameRecord = FrameReport & {
  file: string
  scenario: string
  pass: boolean
  /** The ticket for a miss that's filed rather than fixed. */
  knownMiss?: string
  /** Why a miss is accepted by design and won't be fixed. */
  exception?: string
}
