'use client'

import {
  type MouseEvent,
  type PointerEvent,
  type SyntheticEvent,
  useRef,
  useState
} from 'react'

import type { BaseUIEvent } from '@base-ui/react/types'

import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect'

type Handler<E extends SyntheticEvent> =
  ((event: BaseUIEvent<E>) => void) | undefined

/** How far a finger may drift before a tap reads as a scroll. */
const SLOP = 10
/** How long a touch may hold the list open, in case its lift never comes. */
const HOLD = 1500

let pressed: {
  element: Element
  pointerId: number
  x: number
  y: number
} | null = null
let pressTimer: ReturnType<typeof setTimeout> | undefined
let choosing = false
/** Options a touch went down on: their mouseup isn't Base UI's to choose. */
const touched = new WeakSet<Element>()
/** Options a lift chose, whose late click mustn't choose again. */
const chosenByTap = new WeakMap<Element, number>()
/** Closes put off while a finger was down, for when it lifts. */
let heldCloses: (() => void)[] = []

function endPress() {
  pressed = null
  clearTimeout(pressTimer)
  const closes = heldCloses
  heldCloses = []
  for (const close of closes) close()
}

/**
 * Touch and pen choose an option on lifting, not on its click. Base UI cancels
 * an option's pointerdown to keep the input focused, which makes WebKit drop
 * the tap's click, and on an iPhone the click can also arrive after the list
 * has closed as the keyboard goes. A lift on the option it went down on, close
 * to where it went down, chooses it. The tap's mouseup never chooses, and its
 * late click doesn't choose again.
 */
export function keepTouchTap<T extends Element>({
  onPointerDownCapture,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onMouseUp,
  onClickCapture
}: {
  onPointerDownCapture?: Handler<PointerEvent<T>>
  onPointerMove?: Handler<PointerEvent<T>>
  onPointerUp?: Handler<PointerEvent<T>>
  onPointerCancel?: Handler<PointerEvent<T>>
  onMouseUp?: Handler<MouseEvent<T>>
  onClickCapture?: Handler<MouseEvent<T>>
}) {
  return {
    onPointerDownCapture(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerDownCapture?.(event)
      const element = event.currentTarget
      // A mouse after a tap clicks as a mouse does.
      chosenByTap.delete(element)
      if (event.pointerType === 'mouse') {
        touched.delete(element)
        endPress()
        return
      }
      // Not gated on isPrimary: a lone tap on an iPhone can arrive without it,
      // and Base UI's cancel would then drop its click.
      touched.add(element)
      endPress()
      pressed = {
        element,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY
      }
      pressTimer = setTimeout(endPress, HOLD)
      event.preventBaseUIHandler()
    },
    onPointerMove(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerMove?.(event)
      if (
        pressed?.pointerId === event.pointerId &&
        Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > SLOP
      )
        endPress()
    },
    onPointerUp(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerUp?.(event)
      const press = pressed
      if (!press || press.pointerId !== event.pointerId) return
      const element = event.currentTarget
      const tapped =
        press.element === element &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) <= SLOP
      pressed = null
      if (tapped) {
        chosenByTap.set(element, performance.now())
        choosing = true
        try {
          ;(element as unknown as HTMLElement).click()
        } finally {
          choosing = false
        }
      }
      endPress()
    },
    // A tap that became a scroll or a long press.
    onPointerCancel(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerCancel?.(event)
      if (pressed?.pointerId === event.pointerId) endPress()
    },
    onMouseUp(event: BaseUIEvent<MouseEvent<T>>) {
      onMouseUp?.(event)
      if (touched.delete(event.currentTarget)) event.preventBaseUIHandler()
    },
    onClickCapture(event: BaseUIEvent<MouseEvent<T>>) {
      onClickCapture?.(event)
      const element = event.currentTarget
      if (choosing) return
      const at = chosenByTap.get(element)
      chosenByTap.delete(element)
      if (at === undefined || performance.now() - at >= HOLD) return
      event.stopPropagation()
      event.preventDefault()
    }
  }
}

type OpenChange<D> = (open: boolean, details: D) => void

/**
 * A list's open state that waits while a finger is down on an option: the
 * keyboard going can blur the input or move the page first. A close asked for
 * meanwhile happens once the finger lifts, unless the lift already closed it.
 */
export function useHeldOpen<
  D extends { cancel: () => void; isCanceled: boolean }
>(
  open: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: OpenChange<D>
) {
  const [own, setOwn] = useState(defaultOpen ?? false)
  const shown = open ?? own
  const shownRef = useRef(shown)
  useIsomorphicLayoutEffect(() => {
    shownRef.current = shown
  })
  const apply: OpenChange<D> = (next, details) => {
    // Now, not on render, so a held close queued before it sees it.
    shownRef.current = next
    if (open === undefined) setOwn(next)
    onOpenChange(next, details)
  }
  const change: OpenChange<D> = (next, details) => {
    if (!next && pressed) {
      details.cancel()
      // Replayed as an accepted close, so the list's own close cleanup runs.
      heldCloses.push(() => {
        if (shownRef.current) apply(false, { ...details, isCanceled: false })
      })
      return
    }
    apply(next, details)
  }
  return [shown, change] as const
}
