import { expect } from 'vitest'

// The steepest the turn's easing gets, as a share of the distance per share
// of the time.
const STEEPEST = 1.8

type Frame = {
  time: number
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
    frames.push({ time, title, days })
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
      (STEEPEST * distance * (now.time - before.time)) / durationMs + 1
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
