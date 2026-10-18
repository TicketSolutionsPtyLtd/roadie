import { userEvent } from 'vitest/browser'

// Base UI ignores WebKit mouse and pointer moves with no movement, which is all
// Playwright sends there, so move onto the element the way a hand would. The
// pointer move also tells Base UI a mouse is in use, so leaving resets the
// highlight.
export async function pointAt(element: Element) {
  await userEvent.hover(element)
  const moved = { bubbles: true, movementX: 1, movementY: 1 }
  element.dispatchEvent(
    new PointerEvent('pointermove', { ...moved, pointerType: 'mouse' })
  )
  element.dispatchEvent(new MouseEvent('mousemove', moved))
}
