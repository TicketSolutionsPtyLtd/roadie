export const PRESSED_ITEM = '[data-slot="toggle-group-item"][data-pressed]'

/** Scrolls a group sideways just far enough to show the item. */
function reveal(group: HTMLElement, item: HTMLElement) {
  const start = item.offsetLeft - group.scrollLeft
  const end = start + item.offsetWidth - group.clientWidth
  if (start < 0) group.scrollLeft += start
  else if (end > 0) group.scrollLeft += end
}

/**
 * Keeps an indicator over the group's pressed item via CSS variables, and the
 * item in view when the group scrolls.
 * Offsets, not bounding rects, so a mid-press scale doesn't skew them.
 */
export function followPressedItem(
  indicator: HTMLElement,
  onReadyChange: (ready: boolean) => void
) {
  const group = indicator.parentElement
  if (!group) return

  const place = () => {
    const item = group.querySelector<HTMLElement>(PRESSED_ITEM)
    if (item) {
      indicator.style.setProperty('--pressed-item-left', `${item.offsetLeft}px`)
      indicator.style.setProperty('--pressed-item-top', `${item.offsetTop}px`)
      indicator.style.setProperty(
        '--pressed-item-width',
        `${item.offsetWidth}px`
      )
      indicator.style.setProperty(
        '--pressed-item-height',
        `${item.offsetHeight}px`
      )
      reveal(group, item)
    }
    onReadyChange(item !== null)
  }

  const resize =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
  resize?.observe(group)
  const mutations = new MutationObserver(place)
  mutations.observe(group, {
    subtree: true,
    childList: true,
    attributeFilter: ['data-pressed']
  })
  place()

  return () => {
    resize?.disconnect()
    mutations.disconnect()
  }
}
