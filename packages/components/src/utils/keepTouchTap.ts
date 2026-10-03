import type { MouseEvent, PointerEvent, SyntheticEvent } from 'react'

import type { BaseUIEvent } from '@base-ui/react/types'

type Handler<E extends SyntheticEvent> =
  ((event: BaseUIEvent<E>) => void) | undefined

const tapped = new WeakSet<Element>()

/**
 * Base UI cancels an option's pointerdown so the input keeps focus, and WebKit
 * then drops the click a touch tap makes, so a tapped option never chooses on
 * an iPhone. A touch keeps focus anyway, as its compatibility mousedown is
 * cancelled too. The click chooses, so the tap's mouseup doesn't as well.
 */
export function keepTouchTap<T extends Element>({
  onPointerDownCapture,
  onMouseUp
}: {
  onPointerDownCapture?: Handler<PointerEvent<T>>
  onMouseUp?: Handler<MouseEvent<T>>
}) {
  return {
    onPointerDownCapture(event: BaseUIEvent<PointerEvent<T>>) {
      onPointerDownCapture?.(event)
      if (event.pointerType !== 'touch') return
      tapped.add(event.currentTarget)
      event.preventBaseUIHandler()
    },
    onMouseUp(event: BaseUIEvent<MouseEvent<T>>) {
      onMouseUp?.(event)
      if (tapped.delete(event.currentTarget)) event.preventBaseUIHandler()
    }
  }
}
