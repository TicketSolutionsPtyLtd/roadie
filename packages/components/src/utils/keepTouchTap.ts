import type { MouseEvent, PointerEvent, SyntheticEvent } from 'react'

import type { BaseUIEvent } from '@base-ui/react/types'

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
  at: number
} | null = null
const chosenByTap = new WeakMap<Element, number>()
let choosing = false

/** Whether a finger is down on an option, so the list must stay open. */
export function touchOnOption(): boolean {
  return !!pressed && performance.now() - pressed.at < HOLD
}

/**
 * Touch and pen choose an option on lifting, not on its click. Base UI cancels
 * an option's pointerdown to keep the input focused, which makes WebKit drop
 * the tap's click, and on an iPhone the click can also arrive after the list
 * has closed as the keyboard goes. A lift on the option it went down on, close
 * to where it went down, chooses it; the mouse events and click that follow
 * are swallowed, so it isn't chosen twice.
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
  const recentlyTapped = (element: Element) =>
    performance.now() - (chosenByTap.get(element) ?? -Infinity) < HOLD
  return {
    onPointerDownCapture(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerDownCapture?.(event)
      // Not gated on isPrimary: a lone tap on an iPhone can arrive without it,
      // and Base UI's cancel would then drop its click.
      if (event.pointerType === 'mouse') {
        pressed = null
        return
      }
      pressed = {
        element: event.currentTarget,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        at: performance.now()
      }
      event.preventBaseUIHandler()
    },
    onPointerMove(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerMove?.(event)
      if (
        pressed?.pointerId === event.pointerId &&
        Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > SLOP
      )
        pressed = null
    },
    onPointerUp(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerUp?.(event)
      const press = pressed
      if (!press || press.pointerId !== event.pointerId) return
      pressed = null
      const element = event.currentTarget
      if (
        press.element !== element ||
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > SLOP
      )
        return
      chosenByTap.set(element, performance.now())
      choosing = true
      try {
        ;(element as unknown as HTMLElement).click()
      } finally {
        choosing = false
      }
    },
    // A tap that became a scroll or a long press.
    onPointerCancel(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerCancel?.(event)
      if (pressed?.pointerId === event.pointerId) pressed = null
    },
    onMouseUp(event: BaseUIEvent<MouseEvent<T>>) {
      onMouseUp?.(event)
      if (recentlyTapped(event.currentTarget)) event.preventBaseUIHandler()
    },
    onClickCapture(event: BaseUIEvent<MouseEvent<T>>) {
      onClickCapture?.(event)
      if (choosing || !recentlyTapped(event.currentTarget)) return
      chosenByTap.delete(event.currentTarget)
      event.stopPropagation()
      event.preventDefault()
    }
  }
}
