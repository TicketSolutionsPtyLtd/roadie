const STAYS_PUT = new Set(['visible', 'clip'])

/** The box `position: sticky` sticks within: any overflow but visible or clip, scrolling or not. */
export function findStickyContainer(node: HTMLElement | null) {
  for (
    let element = node?.parentElement ?? null;
    element;
    element = element.parentElement
  ) {
    const { overflowX, overflowY } = getComputedStyle(element)
    if (!STAYS_PUT.has(overflowX) || !STAYS_PUT.has(overflowY)) return element
  }
  return null
}
