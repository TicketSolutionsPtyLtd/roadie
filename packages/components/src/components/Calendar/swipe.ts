'use client'

import {
  type RefObject,
  startTransition,
  useCallback,
  useEffect,
  useRef
} from 'react'

import { flushSync } from 'react-dom'

import { durationToken, easingToken } from '../../utils/motionTokens'
import { prefersReducedMotion } from '../../utils/reducedMotion'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'

export type SwipeStep = 1 | -1

/** Where the page a step turns to sits beside the one shown. */
export type PeekSide = 'left' | 'right' | 'top' | 'bottom'
export type Peek = { step: SwipeStep; side: PeekSide }

type Shape = {
  before: Map<string, DOMRect>
  from: DOMRect
  font: string
  color: string
}

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
// A swiped finger lifts over a day; the click that can follow isn't a press.
const CLICK_AFTER_SWIPE_MS = 500

const GRIDS = '[data-slot="calendar-grid"]'
const DAYS = '[data-slot="calendar-days"]'
// What moves: the days of one page, or whole months when several show, and
// the page beside them. The weekday row of one page holds still.
const PARTS = '[data-swipe-part]'
const PEEK = '[data-peek]'
const MONTHS = '[data-slot="calendar-months"]'
// How much of the way to the days kept a row grows from or folds into: all of
// it piles the rows up on one line.
const GROW = 0.5
type Keyframes = Parameters<Element['animate']>[0]
const DAY = 'button[data-date]:not([data-outside])'

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
  /**
   * Applies a change of view as a transition, so its render is spread over
   * frames, then eases the days from where they were once `reshaped` says it
   * has landed: the days in both views glide, the rows coming in grow out of
   * them and fade in, and the rows leaving fold into them and fade out.
   */
  reshape: (apply: () => void) => void
  /** Called as the new view commits, to start easing into it. */
  reshaped: () => void
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
  const reshapeView = useRef<((apply: () => void) => void) | null>(null)
  // Measured before a view switch, and kept here rather than in the effect,
  // as the switch can set the effect up anew before it lands.
  const pendingShape = useRef<Shape | null>(null)
  const landShape = useRef<(() => void) | null>(null)
  // Which operation last marked the calendar as moving, so one that outlives
  // its effect clears the mark only if nothing has taken it since.
  const marked = useRef(0)
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
    // A turn waiting for its slide to end, applied at once if cut short, and
    // where its slide stops.
    let pending: (() => void) | null = null
    let landing = 0
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
    // A drag holds on whole device pixels: a fractional rest makes WebKit
    // resample the days, which shimmer at the edges. A slide stays exact, so
    // a page lands where its neighbour sat; it passes through fractions anyway.
    const offset = (by: number, snap = true) => {
      const scale = window.devicePixelRatio || 1
      const at = snap ? Math.round(by * scale) / scale : by
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
    const slide = (from: number, to: number, step: 'moderate' | 'slow') =>
      Promise.all(
        parts().map((part) => {
          const animation = part.animate(
            [
              { transform: offset(from, false) },
              { transform: offset(to, false) }
            ],
            {
              duration: durationToken(part, step),
              easing: easingToken(part, 'enter'),
              fill: 'forwards'
            }
          )
          running.push(animation)
          return animation.finished.catch(() => undefined)
        })
      )
    // Where the strip sits now, partway through a slide.
    const shift = () => {
      const first = parts()[0]
      if (!first) return 0
      const matrix = new DOMMatrixReadOnly(getComputedStyle(first).transform)
      return vertical ? matrix.m42 : matrix.m41
    }
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
    // In step with the frame that resets the strip, unless React is
    // mid-commit, so a page beside is never left out past the edges.
    const hidePeek = (sync: boolean) => {
      if (shownPeek === null) return
      shownPeek = null
      partsSeen = null
      if (!root.isConnected) return
      if (sync) flushSync(() => latest.current.onPeek(null))
      else latest.current.onPeek(null)
    }

    const positionOf = (element: Element) => {
      const box = element.getBoundingClientRect()
      return vertical ? box.top : box.left
    }
    // How far the strip moves for a step: the page that comes first, to where
    // the first shown page sits. Signed, so a right-to-left row reads the
    // same; the pages sit a gap apart whatever their size, so every one lands
    // where its successor will be.
    const travelOf = (step: SwipeStep) => {
      const shown = parts().filter((part) => !part.closest(PEEK))
      const beside = root.querySelector(PEEK)
      const comes = step === 1 ? (shown[1] ?? beside) : beside
      if (!comes || !shown[0]) return signOf(step) * -sizeOf(root)
      return positionOf(comes) - positionOf(shown[0])
    }

    // What a reshape leaves to clear: the rows leaving, drawn over the days.
    let unshape: (() => void) | null = null
    const shaping: Animation[] = []
    const endShape = () => {
      for (const animation of shaping.splice(0)) animation.cancel()
      unshape?.()
      unshape = null
    }

    const finish = (sync = true) => {
      stopAnimations()
      endShape()
      place(0)
      hidePeek(sync)
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

    // Lands the turn under way at once, and says where the strip sits after
    // it, so the next one goes on from there.
    const cutShort = () => {
      pendingShape.current = null
      if (!settling) return 0
      run++
      const at = shift()
      stopAnimations()
      const waiting = pending
      pending = null
      if (waiting) applyTurn(waiting)
      finish()
      return waiting ? at - landing : at
    }

    // `from` is where the days sit now: under the finger, or at rest.
    async function animateTurn(
      from: number,
      step: SwipeStep | null,
      apply: () => void,
      immediate = false
    ) {
      const carried = cutShort()
      // A control turning the page ends any drag under way, from where the
      // days sit under it.
      if (!from && gesture) {
        if (gesture.engaged) from = gesture.along
        gesture = null
      }
      if (!from) from = carried
      // Landing the turn before it reached a bound leaves nothing to slide
      // to, so the strip settles back; the apply still runs, so a key's
      // focus moves.
      if (step && !immediate && !latest.current.canTurn(step)) {
        apply()
        step = null
      }
      const mine = ++run
      settling = true
      root!.dataset.swiping = String(++marked.current)
      const still =
        prefersReducedMotion() || typeof root!.animate !== 'function'
      if (step && immediate) {
        applyTurn(apply)
        if (!still) {
          // One offset for every part, so a column of months moves as one:
          // a whole stride, from where the new page would sit beside the
          // first, so a title in the gap enters from beyond the edge too.
          const [first, second] = parts()
          const months = root!.querySelector(MONTHS)
          const stride = second
            ? Math.abs(positionOf(second) - positionOf(first!))
            : (first ? sizeOf(first) : 0) +
              (vertical && months
                ? parseFloat(getComputedStyle(months).rowGap) || 0
                : 0)
          await slide(-signOf(step) * stride, 0, 'moderate')
        }
      } else if (step) {
        pending = apply
        if (!still) {
          // The incoming pages sit beside the shown ones as one strip, which
          // moves once, from where it is to where the first comes to rest.
          showPeek(step)
          place(from)
          landing = -travelOf(step)
          // A lifted finger's turn carries on; a control's turns a whole page.
          await slide(from, landing, from ? 'moderate' : 'slow')
        }
        // Torn down mid-slide, such as by the calendar being disabled, or
        // cut short by a later turn, which has applied this one.
        if (disposed || mine !== run || !root!.isConnected) return
        pending = null
        // Each page now sits where the turn lays it out, so applying the turn
        // and resetting the strip before the next frame moves nothing.
        applyTurn(apply)
      } else if (!still && from) {
        place(0)
        await slide(from, 0, 'moderate')
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
    reshapeView.current = (apply) => {
      cutShort()
      const viewport = root.querySelector<HTMLElement>(MONTHS)
      if (
        !viewport ||
        prefersReducedMotion() ||
        typeof root.animate !== 'function'
      )
        return apply()
      // Every read before the commit, every read after it, then only writes,
      // so the switch lays the page out once.
      const before = new Map<string, DOMRect>()
      for (const day of viewport.querySelectorAll<HTMLElement>(DAY))
        if (!day.closest(PEEK))
          before.set(day.dataset.date!, day.getBoundingClientRect())
      const from = viewport.getBoundingClientRect()
      // The leaving days are drawn as plain numbers in the days' own type:
      // they fade within a few frames, and copying the calendar costs one.
      const sample = viewport.querySelector(DAY)
      const type = sample && getComputedStyle(sample)
      pendingShape.current = {
        before,
        from,
        font: type?.font ?? '',
        color: type?.color ?? ''
      }
      // A transition, so rendering the new view yields to frames as it goes.
      startTransition(apply)
    }
    const land = () => {
      const shape = pendingShape.current
      pendingShape.current = null
      const viewport = root.querySelector<HTMLElement>(MONTHS)
      if (!shape || disposed || !viewport) return
      const { before, from } = shape
      const to = viewport.getBoundingClientRect()
      const after = new Map<HTMLElement, DOMRect>()
      for (const day of viewport.querySelectorAll<HTMLElement>(DAY))
        after.set(day, day.getBoundingClientRect())
      const rowsAfter = Array.from(
        viewport.querySelectorAll<HTMLElement>('tbody tr'),
        (row) => [row, row.getBoundingClientRect()] as const
      )

      const mine = ++run
      settling = true
      const mark = String(++marked.current)
      root.dataset.swiping = mark
      const middle = (box: DOMRect) => box.top + box.height / 2
      const stays = new Set(
        Array.from(after.keys(), (day) => day.dataset.date!)
      )
      const kept = [...stays].flatMap((date) => before.get(date) ?? [])
      // Where the days in both views sat, which the rest grow from or fold into.
      const anchor = kept.length
        ? kept.reduce((sum, box) => sum + middle(box), 0) / kept.length
        : null
      const toward = (box: DOMRect) =>
        anchor === null ? 0 : (anchor - middle(box)) * GROW
      const moves: Promise<unknown>[] = []
      const animate = (element: Element, frames: Keyframes) => {
        const animation = element.animate(frames, {
          duration: durationToken(element, 'moderate'),
          easing: easingToken(element, 'enter'),
          fill: 'forwards'
        })
        shaping.push(animation)
        moves.push(animation.finished.catch(() => undefined))
      }

      // The height changes once: at once as the days grow, so the page
      // below moves a single time, or at the end as they shrink. The clip
      // shows the days between, without laying the page out each frame.
      const grows = to.height >= from.height
      const hidden = Math.abs(to.height - from.height)
      if (!grows) viewport.style.height = `${from.height}px`
      animate(
        viewport,
        grows
          ? [
              { clipPath: `inset(0 0 ${hidden}px 0)` },
              { clipPath: 'inset(0 0 0px 0)' }
            ]
          : [
              { clipPath: 'inset(0 0 0px 0)' },
              { clipPath: `inset(0 0 ${hidden}px 0)` }
            ]
      )
      const clearHeight = () => viewport.style.removeProperty('height')

      for (const [day, box] of after) {
        const was = before.get(day.dataset.date!)
        if (!was) continue
        const dx = was.left + was.width / 2 - (box.left + box.width / 2)
        const dy = middle(was) - middle(box)
        // One scale for both axes, so the number keeps its shape as a
        // circle's day grows into a taller tile's.
        const scale = Math.sqrt(
          (was.width / box.width) * (was.height / box.height)
        )
        animate(day, [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${scale})`
          },
          { transform: 'none' }
        ])
      }
      // Rows coming in move whole, one layer each.
      for (const [row, box] of rowsAfter) {
        const days = Array.from(row.querySelectorAll<HTMLElement>(DAY))
        if (!days.length || days.some((day) => before.has(day.dataset.date!)))
          continue
        animate(row, [
          { transform: `translateY(${toward(box)}px)`, opacity: 0 },
          { opacity: 0, offset: 0.15 },
          { transform: 'none', opacity: 1 }
        ])
      }

      // The old days that leave, inert and unnamed, over the new ones
      // until they fold away, a row at a time.
      const leaving = document.createElement('div')
      leaving.dataset.leaving = ''
      leaving.inert = true
      leaving.setAttribute('aria-hidden', 'true')
      Object.assign(leaving.style, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        contain: 'strict',
        font: shape.font,
        color: shape.color
      })
      const rows = new Map<number, [string, DOMRect][]>()
      for (const [date, box] of before) {
        if (stays.has(date)) continue
        const row = rows.get(box.top) ?? []
        row.push([date, box])
        rows.set(box.top, row)
      }
      const keptTops = new Set(kept.map((box) => box.top))
      for (const [top, days] of rows) {
        const row = document.createElement('div')
        for (const [date, box] of days) {
          const day = document.createElement('span')
          day.textContent = String(Number(date.slice(8)))
          Object.assign(day.style, {
            position: 'absolute',
            display: 'grid',
            placeItems: 'center',
            left: `${box.left - from.left}px`,
            top: `${box.top - from.top}px`,
            width: `${box.width}px`,
            height: `${box.height}px`
          })
          row.append(day)
        }
        leaving.append(row)
        // A row that stays loses only the days the new view leaves out.
        animate(
          row,
          keptTops.has(top)
            ? [{ opacity: 1 }, { opacity: 0, offset: 0.6 }, { opacity: 0 }]
            : [
                { transform: 'none', opacity: 1 },
                { opacity: 0, offset: 0.6 },
                {
                  transform: `translateY(${toward(days[0]![1])}px)`,
                  opacity: 0
                }
              ]
        )
      }
      viewport.append(leaving)
      unshape = () => {
        leaving.remove()
        clearHeight()
      }
      void Promise.all(moves).then(() => {
        // Set up anew mid-switch, as when the view changes how the calendar
        // pages: the switch plays out and clears up after itself.
        if (disposed) {
          endShape()
          if (root.dataset.swiping === mark) delete root.dataset.swiping
          return
        }
        if (mine !== run) return
        finish()
      })
    }
    landShape.current = land
    // Only a turn not yet applied: a parent following a turn's own month
    // arrives while it applies, and the slide in goes on.
    dropTurn.current = () => {
      if (!settling || !pending) return
      run++
      pending = null
      // A parent's month arrives mid-commit, so the page beside goes with it.
      finish(false)
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
        root.dataset.swiping = String(++marked.current)
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
      reshapeView.current = null
      if (landShape.current === land) landShape.current = null
      const waiting = pending
      pending = null
      // Still shown, as when the calendar is disabled mid-slide; a turn for a
      // calendar that has closed is dropped.
      if (root.isConnected) waiting?.()
      hidePeek(false)
      // A switch under way outlives this, as the view it switches to can be
      // what set the calendar up anew.
      const switching = !!unshape && root.isConnected
      if (!switching) endShape()
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
      if (!switching) delete root.dataset.swiping
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
  const reshape = useCallback(
    (apply: () => void) =>
      reshapeView.current ? reshapeView.current(apply) : apply(),
    []
  )
  // After the commit and the updates its effects make, which React works
  // through before the task ends, and before any frame shows it; by then the
  // effect may be set up anew, so it lands through whichever is current.
  const reshaped = useCallback(
    () => queueMicrotask(() => landShape.current?.()),
    []
  )
  return {
    pageTurn: turnPage,
    landTurn: land,
    dropTurn: drop,
    reshape,
    reshaped
  }
}
