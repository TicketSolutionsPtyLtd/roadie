import { expect } from 'vitest'

// The steepest Calendar's easing, --ease-enter, gets, as a share of the
// distance per share of the time: it starts at five times its average speed.
const STEEPEST = 5
// An engine's animation clock can run up to a frame ahead of the timestamp
// its frame reports, WebKit's especially, as it counts whole milliseconds.
const LATE_MS = 1000 / 60

// WebKit lays out a running animation at the moment it's read, not at the
// frame's time as Chromium and Firefox do, so a frame read late shows the days
// further on, as far as the moment its read ends.
const elapsed = (before: { time: number }, now: { readEnd: number }) =>
  now.readEnd - before.time

type Frame = {
  time: number
  readEnd: number
  title: string
  days: Map<string, number>
}

const root = () =>
  document.querySelector<HTMLElement>('[data-slot="calendar"]')!

// Every day's position along the turn and the first title, frame by frame,
// from `start` until the calendar has been still for a few frames.
export async function recordFrames(vertical: boolean, start: () => unknown) {
  const frames: Frame[] = []
  const read = (time: number) => {
    const days = new Map<string, number>()
    for (const button of root().querySelectorAll<HTMLElement>(
      'button[data-date]:not([data-outside])'
    )) {
      const box = button.getBoundingClientRect()
      days.set(button.dataset.date!, vertical ? box.top : box.left)
    }
    const title =
      root().querySelector('[id$="-caption-0"]')?.textContent?.trim() ?? ''
    frames.push({ time, readEnd: performance.now(), title, days })
  }
  let turning = false
  let after = 0
  const done = new Promise<void>((resolve) => {
    const tick = (time: number) => {
      read(time)
      if (root().hasAttribute('data-swiping')) {
        turning = true
        after = 0
      } else if (turning && ++after > 4) return resolve()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await start()
  await done
  return frames
}

export function expectOneContinuousMotion(
  frames: Frame[],
  forward: 1 | -1,
  durationMs: number
) {
  const last = frames.at(-1)!
  // Each day from where it is first seen to where it is last seen.
  const seen = new Map<string, [number, number]>()
  for (const frame of frames)
    for (const [date, at] of frame.days)
      seen.set(date, [seen.get(date)?.[0] ?? at, at])
  const distance = Math.max(
    ...[...seen.values()].map(([from, to]) => Math.abs(to - from))
  )
  expect(distance).toBeGreaterThan(50)
  for (let i = 1; i < frames.length; i++) {
    const before = frames[i - 1]!
    const now = frames[i]!
    const limit =
      (STEEPEST * distance * (elapsed(before, now) + LATE_MS)) / durationMs + 1
    for (const [date, at] of now.days) {
      const was = before.days.get(date)
      if (was === undefined) continue
      const moved = (at - was) * forward
      // Never back against the turn, and never further than the curve allows.
      expect(moved, `${date} at frame ${i}`).toBeGreaterThanOrEqual(-0.5)
      expect(moved, `${date} at frame ${i}`).toBeLessThanOrEqual(limit)
    }
  }
  // The title changes once, on a frame from which nothing moves again.
  const changes = frames.flatMap((frame, i) =>
    i && frame.title !== frames[i - 1]!.title ? [i] : []
  )
  expect(changes).toHaveLength(1)
  for (const frame of frames.slice(changes[0]!)) {
    for (const [date, at] of frame.days)
      expect(at, `${date} after the title changed`).toBeCloseTo(
        last.days.get(date)!,
        0
      )
  }
}

type Shape = { x: number; y: number; opacity: number }
type ShapeFrame = {
  time: number
  readEnd: number
  days: Map<string, Shape>
  leaving: Shape[]
  height: number
}

const shapeOf = (element: Element): Shape => {
  const box = element.getBoundingClientRect()
  return {
    x: box.left + box.width / 2,
    y: box.top + box.height / 2,
    opacity: Number(getComputedStyle(element).opacity)
  }
}

// Each day's centre and opacity, the rows leaving and the height of the days'
// viewport, frame by frame, from `start` until the calendar is still.
export async function recordShapes(start: () => unknown) {
  const frames: ShapeFrame[] = []
  const read = (time: number) => {
    const days = new Map<string, Shape>()
    for (const button of root().querySelectorAll<HTMLElement>(
      'button[data-date]:not([data-outside])'
    ))
      days.set(button.dataset.date!, shapeOf(button))
    const leaving = Array.from(
      root().querySelectorAll('[data-leaving] > div'),
      shapeOf
    )
    const height = root()
      .querySelector('[data-slot="calendar-months"]')!
      .getBoundingClientRect().height
    frames.push({ time, readEnd: performance.now(), days, leaving, height })
  }
  let moving = false
  let after = 0
  const done = new Promise<void>((resolve) => {
    const tick = (time: number) => {
      read(time)
      if (root().hasAttribute('data-swiping')) {
        moving = true
        after = 0
      } else if (moving && ++after > 4) return resolve()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await start()
  await done
  return frames
}

const monotonic = (values: number[], label: string) => {
  const direction = Math.sign(values.at(-1)! - values[0]!)
  for (let i = 1; i < values.length; i++)
    expect(
      (values[i]! - values[i - 1]!) * direction,
      `${label} at frame ${i}`
    ).toBeGreaterThanOrEqual(-0.5)
}

/**
 * Days shown in both views glide, never jumping further in a frame than the
 * easing allows; days coming in only fade in and move one way; rows leaving
 * only fade out and move one way; the height moves one way.
 */
export function expectOneReshape(
  frames: ShapeFrame[],
  durationMs: number,
  // The view switch decelerates, steepest at its start.
  steepest = STEEPEST
) {
  const first = frames[0]!
  const last = frames.at(-1)!
  const kept = [...last.days.keys()].filter((date) => first.days.has(date))
  expect(kept.length).toBeGreaterThanOrEqual(5)
  for (const date of kept) {
    const path = frames.flatMap((frame) => frame.days.get(date) ?? [])
    expect(path).toHaveLength(frames.length)
    for (const axis of ['x', 'y'] as const) {
      const distance = Math.abs(path.at(-1)![axis] - path[0]![axis])
      for (let i = 1; i < path.length; i++) {
        const time = elapsed(frames[i - 1]!, frames[i]!) + LATE_MS
        expect(
          Math.abs(path[i]![axis] - path[i - 1]![axis]),
          `${date} ${axis} at frame ${i}`
        ).toBeLessThanOrEqual((steepest * distance * time) / durationMs + 1)
      }
      monotonic(
        path.map((shape) => shape[axis]),
        `${date} ${axis}`
      )
    }
  }
  for (const date of last.days.keys()) {
    if (first.days.has(date)) continue
    const path = frames.flatMap((frame) => frame.days.get(date) ?? [])
    monotonic(
      path.map((shape) => shape.y),
      `${date} coming in`
    )
    monotonic(
      path.map((shape) => shape.opacity),
      `${date} fading in`
    )
  }
  const rows = Math.max(...frames.map((frame) => frame.leaving.length))
  for (let row = 0; row < rows; row++) {
    const path = frames.flatMap((frame) => frame.leaving[row] ?? [])
    monotonic(
      path.map((shape) => shape.y),
      `row ${row} leaving`
    )
    monotonic(
      path.map((shape) => -shape.opacity),
      `row ${row} fading out`
    )
  }
  monotonic(
    frames.map((frame) => frame.height),
    'height'
  )
}
