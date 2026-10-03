'use client'

import { type RefObject, useEffect, useRef } from 'react'

import { flushSync } from 'react-dom'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'

export type SwipeStep = 1 | -1

type SwipeOptions = {
  enabled: boolean
  vertical: boolean
  canTurn: (step: SwipeStep) => boolean
  turn: (step: SwipeStep) => void
}

const SLOP = 8
const FLICK = 0.4
const FLICK_MIN = 32
const OUT_MS = 120
const IN_MS = 220
// A swiped finger lifts over a day; the click that can follow isn't a press.
const CLICK_AFTER_SWIPE_MS = 500

const GRIDS = '[data-slot="calendar-grid"]'

type SwipeSample = { along: number; time: number }

/**
 * Whether a lifted swipe turns the page: dragged a quarter of the days (at
 * most 80px), or flicked. The lift counts as a sample, so a drag held still
 * before lifting has no speed left.
 */
export function swipeTurns({
  along,
  size,
  samples,
  releasedAt
}: {
  along: number
  size: number
  samples: readonly SwipeSample[]
  releasedAt: number
}) {
  if (Math.abs(along) > Math.min(size / 4, 80)) return true
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (!first || !last || Math.abs(along) <= FLICK_MIN) return false
  const elapsed = releasedAt - first.time
  if (elapsed <= 0) return false
  const speed = (last.along - first.along) / elapsed
  return Math.abs(speed) > FLICK && Math.sign(speed) === Math.sign(along)
}

function prefersReducedMotion() {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Turns the page when a finger swipes the days, which follow it unless
 * motion is reduced.
 */
export function useSwipeToTurn(
  rootRef: RefObject<HTMLElement | null>,
  options: SwipeOptions
) {
  const latest = useRef(options)
  useIsomorphicLayoutEffect(() => {
    latest.current = options
  })
  const { enabled, vertical } = options

  useEffect(() => {
    const root = rootRef.current
    if (!enabled || !root) return

    type Gesture = {
      id: number
      x: number
      y: number
      engaged: boolean
      size: number
      along: number
      samples: { along: number; time: number }[]
    }
    let gesture: Gesture | null = null
    let settling = false
    let disposed = false
    let suppressClickUntil = -Infinity
    const running: Animation[] = []

    const grids = () => Array.from(root.querySelectorAll<HTMLElement>(GRIDS))
    const offset = (by: number) =>
      vertical ? `translate3d(0, ${by}px, 0)` : `translate3d(${by}px, 0, 0)`
    const place = (by: number) => {
      for (const grid of grids()) grid.style.transform = by ? offset(by) : ''
    }
    // The finger moves physically; RTL puts the next month on the left.
    const stepOf = (along: number): SwipeStep => {
      const rtl = !vertical && getComputedStyle(root).direction === 'rtl'
      return along < 0 !== rtl ? 1 : -1
    }
    const sizeOf = (grid: HTMLElement) => {
      const box = grid.getBoundingClientRect()
      return vertical ? box.height : box.width
    }
    // Ends as multiples of each grid's own size, as months differ in height.
    const slide = (
      from: number | ((size: number) => number),
      to: number | ((size: number) => number),
      duration: number,
      easing: string
    ) =>
      Promise.all(
        grids().map((grid) => {
          const size = sizeOf(grid)
          const at = (end: typeof from) =>
            offset(typeof end === 'number' ? end : end(size))
          const animation = grid.animate(
            [{ transform: at(from) }, { transform: at(to) }],
            { duration, easing, fill: 'forwards' }
          )
          running.push(animation)
          return animation.finished.catch(() => undefined)
        })
      )
    const stopAnimations = () => {
      for (const animation of running.splice(0)) animation.cancel()
    }
    const finish = () => {
      stopAnimations()
      place(0)
      delete root.dataset.swiping
      settling = false
    }

    async function settle(along: number, step: SwipeStep | null) {
      settling = true
      const still = prefersReducedMotion()
      if (step) {
        const sign = Math.sign(along)
        if (!still) await slide(along, (size) => sign * size, OUT_MS, 'ease-in')
        // Torn down mid-slide, such as by the calendar being disabled.
        if (disposed || !root!.isConnected) return
        flushSync(() => latest.current.turn(step))
        place(0)
        stopAnimations()
        if (!still) await slide((size) => -sign * size, 0, IN_MS, 'ease-out')
        if (disposed) return
      } else if (!still && along) {
        place(0)
        await slide(along, 0, IN_MS, 'ease-out')
        if (disposed) return
      }
      finish()
    }

    const onPointerDown = (event: PointerEvent) => {
      suppressClickUntil = -Infinity
      if (event.pointerType === 'mouse' || !event.isPrimary || settling) return
      // Headers, selects and toggles keep their own gestures.
      if (!(event.target as Element).closest(GRIDS)) return
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        engaged: false,
        size: 0,
        along: 0,
        samples: []
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return
      const dx = event.clientX - gesture.x
      const dy = event.clientY - gesture.y
      const along = vertical ? dy : dx
      const across = vertical ? dx : dy
      if (!gesture.engaged) {
        if (Math.abs(across) > SLOP && Math.abs(across) > Math.abs(along)) {
          gesture = null
          return
        }
        if (Math.abs(along) < SLOP) return
        const box = root.querySelector(GRIDS)?.getBoundingClientRect()
        if (!box) return
        gesture.engaged = true
        gesture.size = vertical ? box.height : box.width
        root.dataset.swiping = ''
      }
      const allowed = latest.current.canTurn(stepOf(along))
      gesture.along = allowed ? along : along / 3
      gesture.samples.push({ along, time: event.timeStamp })
      if (gesture.samples.length > 5) gesture.samples.shift()
      if (!prefersReducedMotion()) place(gesture.along)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return
      const { engaged, samples, size } = gesture
      const along = gesture.along
      if (!engaged) {
        gesture = null
        return
      }
      gesture = null
      suppressClickUntil = performance.now() + CLICK_AFTER_SWIPE_MS
      const step = stepOf(along)
      const turns =
        swipeTurns({ along, size, samples, releasedAt: event.timeStamp }) &&
        latest.current.canTurn(step)
      void settle(along, turns ? step : null)
    }

    const onPointerCancel = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return
      if (gesture.engaged) void settle(gesture.along, null)
      gesture = null
    }

    // Only the click the lifted finger fires; a keyboard click has no detail.
    const onClick = (event: MouseEvent) => {
      if (event.detail === 0 || performance.now() > suppressClickUntil) return
      suppressClickUntil = -Infinity
      event.preventDefault()
      event.stopPropagation()
    }

    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointermove', onPointerMove)
    root.addEventListener('pointerup', onPointerUp)
    root.addEventListener('pointercancel', onPointerCancel)
    root.addEventListener('click', onClick, true)
    return () => {
      disposed = true
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', onPointerUp)
      root.removeEventListener('pointercancel', onPointerCancel)
      root.removeEventListener('click', onClick, true)
      stopAnimations()
      place(0)
      delete root.dataset.swiping
    }
  }, [rootRef, enabled, vertical])
}
