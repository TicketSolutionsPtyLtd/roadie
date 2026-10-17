import { userEvent } from 'vitest/browser'

// Base UI ignores a WebKit mousemove with no movement, which is all
// Playwright sends there, so move onto the element the way a hand would.
export async function pointAt(element: Element) {
  await userEvent.hover(element)
  element.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, movementX: 1, movementY: 1 })
  )
}
