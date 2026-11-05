import type { Engine, FrameStats, MissMarks } from './stats'

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

export type FrameRecord = FrameReport &
  MissMarks & {
    file: string
    scenario: string
    pass: boolean
  }
