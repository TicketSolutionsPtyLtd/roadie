/**
 * Marks the sides a horizontal group can still scroll towards with
 * `data-overflow-left` and `data-overflow-right`, which its edge fade reads.
 * Physical sides, so a right-to-left group, whose scrollLeft runs negative,
 * fades the same way its content runs.
 */
export function watchScrollEdges(group: HTMLElement) {
  const mark = () => {
    const room = group.scrollWidth - group.clientWidth
    const rtl = getComputedStyle(group).direction === 'rtl'
    const fromLeft = rtl ? room + group.scrollLeft : group.scrollLeft
    // scrollWidth rounds to whole pixels, so an end can fall short by one.
    group.toggleAttribute('data-overflow-left', fromLeft > 1)
    group.toggleAttribute('data-overflow-right', fromLeft < room - 1)
  }
  const resize =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(mark)
  // The items too: a full-width group keeps its size as they grow or shrink.
  const observe = () => {
    resize?.disconnect()
    for (const element of [group, ...group.children]) resize?.observe(element)
  }
  const items = new MutationObserver(() => {
    observe()
    mark()
  })
  items.observe(group, { childList: true })
  observe()
  group.addEventListener('scroll', mark, { passive: true })
  mark()
  return () => {
    resize?.disconnect()
    items.disconnect()
    group.removeEventListener('scroll', mark)
  }
}
