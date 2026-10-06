'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'

import { flushSync } from 'react-dom'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'

export type SwipeStep = 1 | -1

/** Where the page a step turns to sits beside the one shown. */
export type PeekSide = 'left' | 'right' | 'top' | 'bottom'
export type Peek = { step: SwipeStep; side: PeekSide }

type SwipeOptions = {
  enabled: boolean
  vertical: boolean
  canTurn: (step: SwipeStep) => boolean
  turn: (step: SwipeStep) => void
  /** Shows the page a step turns to beside the one shown, or none. */
  onPeek: (peek: Peek | null) => void
}

const SLOP = 8
const FLICK = 0.4
const FLICK_MIN = 32
const OUT_MS = 120
const IN_MS = 220
// A swiped finger lifts over a day; the click that can follow isn't a press.
const CLICK_AFTER_SWIPE_MS = 500

const GRIDS = '[data-slot="calendar-grid"]'
const DAYS = '[data-slot="calendar-days"]'
// What moves: the days of one page, or whole months when several show, and
// the page beside them. The weekday row of one page holds still.
const PARTS = '[data-swipe-part]'
const PEEK = '[data-peek]'

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

export type PageTurn = (
  step: SwipeStep,
  apply: () => void,
  options?: {
    /** Apply now and only slide the new page in, as a select's value must change at once. */
    immediate?: boolean
  }
) => void

type PageTurns = {
  pageTurn: PageTurn
  /** Lands a turn under way at once, so a key can go on from it. */
  landTurn: () => void
  /** Drops a turn under way unapplied, as when a parent moves the month. */
  dropTurn: () => void
}

/**
 * Turns the page when a finger swipes the days, which follow it unless
 * motion is reduced. Returns a page turn for the controls that plays the
 * same slide around `apply`, or applies it straight away when it can't.
 */
export function useSwipeToTurn(
  rootRef: RefObject<HTMLElement | null>,
  options: SwipeOptions
): PageTurns {
  const pageTurn = useRef<PageTurn | null>(null)
  const landTurn = useRef<(() => void) | null>(null)
  const dropTurn = useRef<(() => void) | null>(null)
  const latest = useRef(options)
  useIsomorphicLayoutEffect(() => {
    latest.current = options
  })
  const { enabled, vertical } = options

  useEffect(() => {
    const root = rootRef.current
    if (!enabled || !root) return

    type Gesture = {
      kind: 'touch' | 'pointer'
      pen: boolean
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
    // Each turn takes a number, so one cut short stops where it is.
    let run = 0
    // A turn waiting for its slide out, applied at once if cut short.
    let pending: (() => void) | null = null
    let suppressClickUntil = -Infinity
    const running: Animation[] = []

    // Read once a drag or turn, not on every move: the parts change only as a
    // page comes or goes, and reading style after a write forces a recalc.
    let partsSeen: HTMLElement[] | null = null
    const parts = () =>
      (partsSeen ??= Array.from(root.querySelectorAll<HTMLElement>(PARTS)))
    let rtlSeen: boolean | null = null
    const isRtl = () =>
      (rtlSeen ??= !vertical && getComputedStyle(root).direction === 'rtl')
    // On whole device pixels: a fractional move makes WebKit resample the
    // days, which shimmer at the edges.
    const offset = (by: number) => {
      const scale = window.devicePixelRatio || 1
      const at = Math.round(by * scale) / scale
      return vertical
        ? `translate3d(0, ${at}px, 0)`
        : `translate3d(${at}px, 0, 0)`
    }
    const place = (by: number) => {
      for (const part of parts()) part.style.transform = by ? offset(by) : ''
    }
    // The finger moves physically; RTL puts the next month on the left.
    const stepOf = (along: number): SwipeStep =>
      along < 0 !== isRtl() ? 1 : -1
    const sizeOf = (grid: HTMLElement) => {
      const box = grid.getBoundingClientRect()
      return vertical ? box.height : box.width
    }
    // A function end is a multiple of each part's own size, for a page
    // slid in with nothing beside it.
    const slide = (
      from: number | ((size: number) => number),
      to: number | ((size: number) => number),
      duration: number,
      easing: string
    ) =>
      Promise.all(
        parts().map((part) => {
          const size = sizeOf(part)
          const at = (end: typeof from) =>
            offset(typeof end === 'number' ? end : end(size))
          const animation = part.animate(
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

    // Which way the days move on screen for a step, as a finger would drag.
    const signOf = (step: SwipeStep) => ((step === 1) !== isRtl() ? -1 : 1)

    let shownPeek: SwipeStep | null = null
    const peekOf = (step: SwipeStep): Peek => {
      const before = signOf(step) > 0
      return {
        step,
        side: vertical ? (before ? 'top' : 'bottom') : before ? 'left' : 'right'
      }
    }
    // Rendered now, so it can be measured and moved with the days.
    const showPeek = (step: SwipeStep | null) => {
      if (step === shownPeek) return
      shownPeek = step
      flushSync(() => latest.current.onPeek(step && peekOf(step)))
      partsSeen = null
    }
    const hidePeek = () => {
      if (shownPeek === null) return
      shownPeek = null
      if (root.isConnected) latest.current.onPeek(null)
    }
    // How far the strip moves to bring the page beside into place: from the
    // days next to it to its own days.
    const distanceOf = (step: SwipeStep) => {
      const peekDays = root.querySelector(`${PEEK} ${DAYS}`)
      const days = Array.from(root.querySelectorAll(DAYS)).filter(
        (element) => !element.closest(PEEK)
      )
      // By order, not side: a right-to-left row lays the same months out reversed.
      const beside = step === 1 ? days[days.length - 1] : days[0]
      if (!peekDays || !beside) return 0
      const a = peekDays.getBoundingClientRect()
      const b = beside.getBoundingClientRect()
      return Math.abs(vertical ? a.top - b.top : a.left - b.left)
    }

    const positionOf = (element: Element) => {
      const box = element.getBoundingClientRect()
      return vertical ? box.top : box.left
    }
    const dayAt = (date: string) =>
      root.querySelector(
        `${DAYS}:not(${PEEK} *) button[data-date="${date}"]:not([data-outside])`
      )
    const anchorOf = (step: SwipeStep) => {
      const shown = Array.from(root.querySelectorAll(DAYS)).filter(
        (days) => !days.closest(PEEK)
      )
      const page =
        step === 1 && shown[1]
          ? shown[1]
          : root.querySelector(`${PEEK} ${DAYS}`)
      const day = page?.querySelector<HTMLElement>(
        'button[data-date]:not([data-outside])'
      )
      return day ? { date: day.dataset.date!, position: positionOf(day) } : null
    }

    const finish = () => {
      stopAnimations()
      place(0)
      hidePeek()
      partsSeen = null
      rtlSeen = null
      delete root.dataset.swiping
      delete root.dataset.dragging
      settling = false
    }

    // Applies a turn, keeping focus in the calendar when the day that held
    // it leaves with the old page, as a dragged day does.
    const applyTurn = (apply: () => void) => {
      const hadFocus = root.contains(document.activeElement)
      flushSync(apply)
      partsSeen = null
      if (hadFocus && !root.contains(document.activeElement))
        Array.from(
          root.querySelectorAll<HTMLElement>(`${DAYS} button[tabindex="0"]`)
        )
          // A page coming in is inert, so its buttons can't take focus.
          .find((button) => !button.closest(PEEK))
          ?.focus({ preventScroll: true })
    }

    const cutShort = () => {
      if (!settling) return
      // The turn under way stops where it is; its waiting apply runs here.
      run++
      stopAnimations()
      const waiting = pending
      pending = null
      if (waiting) applyTurn(waiting)
      finish()
    }

    // `from` is where the days sit now: under the finger, or at rest.
    async function animateTurn(
      from: number,
      step: SwipeStep | null,
      apply: () => void,
      immediate = false
    ) {
      cutShort()
      // A control turning the page ends any drag under way, from where the
      // days sit under it.
      if (!from && gesture) {
        if (gesture.engaged) from = gesture.along
        gesture = null
      }
      // Landing the turn before it reached a bound leaves nothing to slide
      // to; the apply still runs, so a key's focus moves.
      if (step && from === 0 && !immediate && !latest.current.canTurn(step)) {
        finish()
        return apply()
      }
      const mine = ++run
      settling = true
      root!.dataset.swiping = ''
      const still =
        prefersReducedMotion() || typeof root!.animate !== 'function'
      if (step && immediate) {
        applyTurn(apply)
        if (!still) {
          // One offset for every part, so a column of months moves as one.
          const first = parts()[0]
          const size = first ? sizeOf(first) : 0
          await slide(-signOf(step) * size, 0, IN_MS, 'ease-out')
        }
      } else if (step) {
        const sign = signOf(step)
        pending = apply
        let distance = 0
        if (!still) {
          showPeek(step)
          place(from)
          distance =
            distanceOf(step) ||
            sizeOf(root!.querySelector(`${DAYS}:not(${PEEK} *)`)!)
        }
        // The turn lands halfway, where the strip has gone half a page.
        const halfway = (sign * distance) / 2
        let at = from
        if (!still && Math.abs(from) < distance / 2) {
          await slide(from, halfway, OUT_MS, 'ease-in')
          at = halfway
        }
        // Torn down mid-slide, such as by the calendar being disabled, or
        // cut short by a later turn, which has applied this one.
        if (disposed || mine !== run || !root!.isConnected) return
        pending = null
        // The page that becomes the first shown, held still across the swap:
        // pages differ in height and order, so one distance can't place it.
        const anchor = still ? null : anchorOf(step)
        // The page left behind now sits on the other side, so the strip goes
        // on from where it is without a jump.
        applyTurn(() => {
          apply()
          if (!still) {
            shownPeek = -step as SwipeStep
            latest.current.onPeek(peekOf(-step as SwipeStep))
          }
        })
        stopAnimations()
        if (!still) {
          place(at)
          const landed = anchor && dayAt(anchor.date)
          const resume = landed
            ? at + anchor.position - positionOf(landed)
            : at - sign * distance
          place(resume)
          await slide(resume, 0, IN_MS, 'ease-out')
        }
      } else if (!still && from) {
        place(0)
        await slide(from, 0, IN_MS, 'ease-out')
      }
      if (disposed || mine !== run) return
      finish()
    }

    const settle = (along: number, step: SwipeStep | null) =>
      animateTurn(along, step, () => step && latest.current.turn(step))

    pageTurn.current = (step, apply, turnOptions) => {
      if (typeof root.animate !== 'function') return apply()
      void animateTurn(0, step, apply, turnOptions?.immediate)
    }
    landTurn.current = cutShort
    // Only a turn not yet applied: a parent following a turn's own month
    // arrives while it applies, and the slide in goes on.
    dropTurn.current = () => {
      if (!settling || !pending) return
      run++
      pending = null
      finish()
    }

    const begin = (
      kind: 'touch' | 'pointer',
      pen: boolean,
      id: number,
      x: number,
      y: number,
      time: number,
      target: EventTarget | null
    ) => {
      // Headers, selects and toggles keep their own gestures.
      if (settling || !(target as Element | null)?.closest(GRIDS)) return
      gesture = {
        kind,
        pen,
        id,
        x,
        y,
        engaged: false,
        size: 0,
        along: 0,
        // The start counts, so a flick coalesced into one move has speed.
        samples: [{ along: 0, time }]
      }
    }

    // Whether the gesture is a swipe now, and so owns the move.
    const move = (x: number, y: number, time: number) => {
      if (!gesture) return false
      const dx = x - gesture.x
      const dy = y - gesture.y
      const along = vertical ? dy : dx
      const across = vertical ? dx : dy
      if (!gesture.engaged) {
        if (Math.abs(across) > SLOP && Math.abs(across) > Math.abs(along)) {
          gesture = null
          return false
        }
        if (Math.abs(along) < SLOP) return false
        const box = root.querySelector(DAYS)?.getBoundingClientRect()
        if (!box) return false
        gesture.engaged = true
        gesture.size = vertical ? box.height : box.width
        root.dataset.swiping = ''
        root.dataset.dragging = ''
        // A mouse drag would otherwise select the day numbers.
        if (gesture.kind === 'pointer') getSelection()?.removeAllRanges()
      }
      const step = stepOf(along)
      const allowed = latest.current.canTurn(step)
      gesture.along = allowed ? along : along / 3
      gesture.samples.push({ along, time })
      if (gesture.samples.length > 5) gesture.samples.shift()
      if (!prefersReducedMotion()) {
        // The page the finger is pulling in, or none at a bound.
        showPeek(allowed && along ? step : null)
        place(gesture.along)
      }
      return true
    }

    const end = (time: number) => {
      if (!gesture) return
      const { engaged, samples, size, along } = gesture
      gesture = null
      delete root.dataset.dragging
      if (!engaged) return
      suppressClickUntil = performance.now() + CLICK_AFTER_SWIPE_MS
      const step = stepOf(along)
      const turns =
        swipeTurns({ along, size, samples, releasedAt: time }) &&
        latest.current.canTurn(step)
      void settle(along, turns ? step : null)
    }

    const cancel = () => {
      delete root.dataset.dragging
      if (gesture?.engaged) void settle(gesture.along, null)
      gesture = null
    }

    // Touch events, not pointer events: iOS Safari cancels the pointer once
    // its pan recogniser starts on a vertical drag, even where touch-action
    // stops the scroll, but the touch carries on to touchend.
    const touchOf = (event: TouchEvent) =>
      gesture?.kind === 'touch'
        ? Array.from(event.changedTouches).find(
            (touch) => touch.identifier === gesture!.id
          )
        : undefined

    const onTouchStart = (event: TouchEvent) => {
      suppressClickUntil = -Infinity
      // A mouse drag keeps its gesture. A pen hands over to its touch, which
      // iOS doesn't cancel on a vertical drag as it does the pointer.
      if (gesture?.kind === 'pointer') {
        if (gesture.engaged || !gesture.pen) return
        gesture = null
      }
      if (event.touches.length !== 1) return cancel()
      const touch = event.changedTouches[0]!
      begin(
        'touch',
        false,
        touch.identifier,
        touch.clientX,
        touch.clientY,
        event.timeStamp,
        event.target
      )
    }

    const onTouchMove = (event: TouchEvent) => {
      const touch = touchOf(event)
      if (!touch) return
      // The swipe owns the drag, wherever touch-action falls short.
      if (
        move(touch.clientX, touch.clientY, event.timeStamp) &&
        event.cancelable
      )
        event.preventDefault()
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchOf(event)) end(event.timeStamp)
    }

    const onTouchCancel = (event: TouchEvent) => {
      if (touchOf(event)) cancel()
    }

    // As in Carousel, a mouse drags the days too.
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !event.isPrimary) return
      suppressClickUntil = -Infinity
      if (event.button !== 0 || gesture?.engaged || gesture?.kind === 'touch')
        return
      begin(
        'pointer',
        event.pointerType === 'pen',
        event.pointerId,
        event.clientX,
        event.clientY,
        event.timeStamp,
        event.target
      )
    }

    const onPointerMove = (event: PointerEvent) => {
      if (gesture?.kind !== 'pointer' || event.pointerId !== gesture.id) return
      // Released outside the calendar, or where it never heard.
      if (!event.buttons) return cancel()
      const wasEngaged = gesture.engaged
      if (!move(event.clientX, event.clientY, event.timeStamp)) return
      // Held, so the drag carries on outside the calendar.
      if (!wasEngaged && !root.hasPointerCapture(event.pointerId))
        root.setPointerCapture(event.pointerId)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (gesture?.kind === 'pointer' && event.pointerId === gesture.id)
        end(event.timeStamp)
    }

    const onPointerCancel = (event: PointerEvent) => {
      if (gesture?.kind === 'pointer' && event.pointerId === gesture.id)
        cancel()
    }

    // A dragged link or image would start the browser's own drag instead.
    const onDragStart = (event: DragEvent) => {
      if (gesture) event.preventDefault()
    }

    // Only the click the lifted finger fires; a keyboard click has no detail.
    const onClick = (event: MouseEvent) => {
      if (event.detail === 0 || performance.now() > suppressClickUntil) return
      suppressClickUntil = -Infinity
      event.preventDefault()
      event.stopPropagation()
    }

    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    root.addEventListener('touchend', onTouchEnd)
    root.addEventListener('touchcancel', onTouchCancel)
    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointermove', onPointerMove)
    root.addEventListener('pointerup', onPointerUp)
    root.addEventListener('pointercancel', onPointerCancel)
    root.addEventListener('dragstart', onDragStart)
    root.addEventListener('click', onClick, true)
    return () => {
      disposed = true
      pageTurn.current = null
      landTurn.current = null
      dropTurn.current = null
      const waiting = pending
      pending = null
      // Still shown, as when the calendar is disabled mid-slide; a turn for a
      // calendar that has closed is dropped.
      if (root.isConnected) waiting?.()
      hidePeek()
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('touchend', onTouchEnd)
      root.removeEventListener('touchcancel', onTouchCancel)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', onPointerUp)
      root.removeEventListener('pointercancel', onPointerCancel)
      root.removeEventListener('dragstart', onDragStart)
      root.removeEventListener('click', onClick, true)
      stopAnimations()
      place(0)
      delete root.dataset.swiping
      delete root.dataset.dragging
    }
  }, [rootRef, enabled, vertical])

  const turnPage = useCallback<PageTurn>(
    (step, apply, turnOptions) =>
      pageTurn.current ? pageTurn.current(step, apply, turnOptions) : apply(),
    []
  )
  const land = useCallback(() => landTurn.current?.(), [])
  const drop = useCallback(() => dropTurn.current?.(), [])
  return { pageTurn: turnPage, landTurn: land, dropTurn: drop }
}
