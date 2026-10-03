import type { MouseEvent, PointerEvent, SyntheticEvent } from 'react'

import type { BaseUIEvent } from '@base-ui/react/types'

type Handler<E extends SyntheticEvent> =
  ((event: BaseUIEvent<E>) => void) | undefined

const tapped = new WeakSet<Element>()

/**
 * Base UI cancels an option's pointerdown so the input keeps focus, and WebKit
 * then drops the click a touch or pen tap makes, so a tapped option never
 * chooses on an iPhone or iPad. A tap keeps focus anyway, as its compatibility
 * mousedown is cancelled too. The click chooses, so the tap's mouseup doesn't
 * as well.
 */
export function keepTouchTap<T extends Element>({
  onPointerDownCapture,
  onPointerCancel,
  onMouseUp
}: {
  onPointerDownCapture?: Handler<PointerEvent<T>>
  onPointerCancel?: Handler<PointerEvent<T>>
  onMouseUp?: Handler<MouseEvent<T>>
}) {
  return {
    onPointerDownCapture(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerDownCapture?.(event)
      if (!event.isPrimary) return
      if (event.pointerType === 'mouse') {
        tapped.delete(event.currentTarget)
        return
      }
      tapped.add(event.currentTarget)
      event.preventBaseUIHandler()
    },
    // A tap that became a scroll or a long press sends no mouseup.
    onPointerCancel(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerCancel?.(event)
      tapped.delete(event.currentTarget)
    },
    onMouseUp(event: BaseUIEvent<MouseEvent<T>>) {
      onMouseUp?.(event)
      if (tapped.delete(event.currentTarget)) event.preventBaseUIHandler()
    }
  }
}
