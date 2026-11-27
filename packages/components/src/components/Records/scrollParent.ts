const SCROLLS = new Set(['auto', 'scroll', 'overlay'])

// Pass a node above a sideways scroller: CSS forces its computed overflow-y to
// 'auto' too, so starting inside it false-matches.
/** The nearest ancestor that scrolls vertically, or null for the window. */
export function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  for (
    let element = node?.parentElement ?? null;
    element;
    element = element.parentElement
  ) {
    if (SCROLLS.has(getComputedStyle(element).overflowY)) return element
  }
  return null
}
