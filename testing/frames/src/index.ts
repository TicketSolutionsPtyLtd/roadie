import type { ReactNode } from 'react'

import { type Root, createRoot } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, expect } from 'vitest'
import { commands } from 'vitest/browser'

import type { FrameRecord, FrameReport } from './record'
import {
  type Engine,
  type FrameBudget,
  type MissMarks,
  type RunNote,
  budgetMisses,
  defaultBudget,
  frameNotice,
  missExcuse,
  summariseFrames
} from './stats'

export type { FrameRecord, FrameReport } from './record'
export {
  FRAME_MS,
  MIN_FRAMES,
  type Engine,
  type FrameBudget,
  type FrameStats,
  budgetMisses,
  defaultBudget,
  summariseFrames
} from './stats'

declare module 'vitest/browser' {
  interface BrowserCommands {
    throttleCpu: (rate?: number) => Promise<number>
    renderMetrics: () => Promise<{ styleMs: number; layoutMs: number }>
    recordFrames: (record: FrameRecord) => Promise<void>
    printFrameNotices: (lines: string[]) => Promise<void>
    /** Main-thread self time by function, longest first, between start and stop. */
    profileCpu: (action: 'start' | 'stop', top?: number) => Promise<string[]>
  }
}

export const engine: Engine = navigator.userAgent.includes('Firefox')
  ? 'firefox'
  : navigator.userAgent.includes('Chrome')
    ? 'chromium'
    : 'webkit'

export const frame = () => new Promise<number>(requestAnimationFrame)

export async function settle(frames = 2) {
  for (let i = 0; i < frames; i++) await frame()
}

let cpu = 1
let activeRoot: Root | undefined
let activeContainer: HTMLElement | undefined
const notices: string[] = []

/**
 * Registers the file's hooks: the stylesheet and brand font before its tests,
 * the CPU slowed for them, each test's mount removed after it, and a line
 * printed at the end for each run that was excused or carries a note.
 */
export function setupFrameTests({
  css,
  cpuRate
}: {
  css?: string
  /** A fixed rate instead of ROADIE_PERF_CPU or the calibrated one. */
  cpuRate?: number
} = {}) {
  let style: HTMLStyleElement | undefined
  beforeAll(async () => {
    if (css) {
      style = document.createElement('style')
      style.textContent = css
      document.head.append(style)
    }
    const [face] = await document.fonts.load('1em Intermission')
    if (css && face?.status !== 'loaded')
      throw new Error('Intermission did not load, so text would measure wrong')
    cpu = await commands.throttleCpu(cpuRate)
  })
  afterAll(async () => {
    await commands.throttleCpu(1)
    cpu = 1
    style?.remove()
    await commands.printFrameNotices(notices.splice(0))
  })
  afterEach(unmount)
}

function unmount() {
  activeRoot?.unmount()
  activeContainer?.remove()
  activeRoot = undefined
  activeContainer = undefined
}

/**
 * Renders `node` in a fresh container and waits `frames` frames, so mounting
 * isn't measured. Production React has no `act` to wait with.
 */
export async function mount(node: ReactNode, { frames = 2 } = {}) {
  unmount()
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)
  activeRoot.render(node)
  await settle(frames)
  return activeContainer
}

// Vitest runs each file in an iframe, and Chromium reports long animation
// frames only to the top-level page, so they're observed there.
const observerFor = (type: string) => {
  const top = (() => {
    try {
      return (window.top as (Window & typeof globalThis) | null)
        ?.PerformanceObserver
    } catch {
      return undefined
    }
  })()
  const Observer =
    type === 'long-animation-frame' && top
      ? top
      : globalThis.PerformanceObserver
  return Observer?.supportedEntryTypes.includes(type) ? Observer : undefined
}

// Chromium reports long tasks and long animation frames; WebKit and Firefox
// report neither, so their counts are null rather than a false zero.
function watchLongWork() {
  const types = ['longtask', 'long-animation-frame'] as const
  const durations: Record<(typeof types)[number], number[] | null> = {
    longtask: null,
    'long-animation-frame': null
  }
  const observers = types.flatMap((type) => {
    const Observer = observerFor(type)
    if (!Observer) return []
    const seen: number[] = []
    durations[type] = seen
    const observer = new Observer((list: PerformanceObserverEntryList) => {
      for (const entry of list.getEntries())
        seen.push(Math.round(entry.duration))
    })
    observer.observe({ type, buffered: false })
    return [observer]
  })
  return () => {
    for (const observer of observers) observer.disconnect()
    const read = (seen: number[] | null) =>
      seen
        ? { count: seen.length, longest: Math.max(0, ...seen) }
        : { count: null, longest: null }
    const tasks = read(durations.longtask)
    const frames = read(durations['long-animation-frame'])
    return {
      longTasks: tasks.count,
      longestTask: tasks.longest,
      longFrames: frames.count,
      longestFrame: frames.longest
    }
  }
}

function report(deltas: number[], longWork: ReturnType<typeof watchLongWork>) {
  return { ...summariseFrames(deltas), engine, cpu, ...longWork() }
}

/**
 * Runs `step` at the start of each of `frames` frames, as input would, and
 * reports the frame times. Scroll, drag, or animate in `step`. `warmup` runs
 * that many uncounted frames of `step` first, so code the browser compiles
 * the first time the step runs isn't counted.
 */
export async function measureFrames(
  step: (index: number) => void,
  { frames = 120, warmup = 0 } = {}
): Promise<FrameReport> {
  // Started on the first counted frame, so warm-up work isn't counted.
  let stopWatching: ReturnType<typeof watchLongWork> | undefined
  const deltas: number[] = []
  await new Promise<void>((resolve) => {
    let warmed = 0
    let last: number | undefined
    const tick = (now: number) => {
      if (warmed < warmup) {
        step(warmed++)
        requestAnimationFrame(tick)
        return
      }
      if (last === undefined) stopWatching = watchLongWork()
      else deltas.push(now - last)
      last = now
      if (deltas.length < frames) {
        step(warmup + deltas.length)
        requestAnimationFrame(tick)
      } else resolve()
    }
    requestAnimationFrame(tick)
  })
  return report(deltas, stopWatching!)
}

/**
 * Reports the frame times while `run` drives the page, for input that takes
 * its own time (a real pointer, typing) or a transition left to finish. Keeps
 * counting until `frames` frames have passed, and at least `after` frames
 * after `run` resolves.
 */
export async function measureWhile(
  run: () => Promise<unknown>,
  { frames = 60, after = 10 } = {}
): Promise<FrameReport> {
  const stopWatching = watchLongWork()
  const deltas: number[] = []
  let ranUntil = Infinity
  const counted = new Promise<void>((resolve) => {
    let last: number | undefined
    const tick = (now: number) => {
      if (last !== undefined) deltas.push(now - last)
      last = now
      if (deltas.length < Math.max(frames, ranUntil + after))
        requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
  try {
    await run()
  } finally {
    ranUntil = deltas.length
    await counted
  }
  return report(deltas, stopWatching)
}

/**
 * Records the run under `scenario` and fails the test if it misses the
 * budget: the p95 frame and the share of frames dropped, over enough frames
 * that one hiccup can't fail it. `knownMiss` names the ticket for a miss
 * that's filed rather than fixed, and `exception` the reason a miss is
 * accepted by design: either way the run is still recorded, but doesn't fail.
 * `note` keeps a short remark with the run, such as its style time.
 */
export async function expectFrameBudget(
  scenario: string,
  frames: FrameReport,
  {
    knownMiss,
    exception,
    note,
    ...budget
  }: Partial<FrameBudget> & MissMarks & RunNote = {}
) {
  const limits = { ...defaultBudget(engine), ...budget }
  const misses = budgetMisses(frames, limits)
  const file = (expect.getState().testPath ?? '').replace(
    /^.*?\/(packages|docs)\//,
    '$1/'
  )
  await commands.recordFrames({
    ...frames,
    file,
    scenario,
    pass: misses.length === 0,
    ...(knownMiss && { knownMiss }),
    ...(exception && { exception }),
    ...(note && { note })
  })
  const marks = { knownMiss, exception, note }
  const notice = frameNotice(scenario, frames, misses, marks)
  if (notice) notices.push(notice)
  if (missExcuse(frames.frames, marks)) return
  expect(misses, `${scenario}: ${JSON.stringify(frames)}`).toEqual([])
}
