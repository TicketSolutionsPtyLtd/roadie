import { markScrollEdges } from './scrollEdges'

export const PRESSED_ITEM = '[data-slot="toggle-group-item"][data-pressed]'

/**
 * Scrolls a group sideways just far enough to show the item clear of the edge
 * fade, with the track's padding beside it, which holds the item's focus ring.
 */
export function revealItem(group: HTMLElement, item: HTMLElement) {
  const style = getComputedStyle(group)
  const fade = parseFloat(style.getPropertyValue('--toggle-group-fade')) || 0
  const start =
    item.offsetLeft - parseFloat(style.paddingLeft) - fade - group.scrollLeft
  const end =
    item.offsetLeft +
    item.offsetWidth +
    parseFloat(style.paddingRight) +
    fade -
    group.scrollLeft -
    group.clientWidth
  if (start < 0) group.scrollLeft += start
  else if (end > 0) group.scrollLeft += end
  else return
  // Now, not on the scroll event, which Firefox can hold back.
  markScrollEdges(group)
}

/**
 * Keeps an indicator over the group's pressed item via CSS variables, and the
 * focused item, or else the pressed one, in view as the group changes.
 * Offsets, not bounding rects, so a mid-press scale doesn't skew them.
 */
export function followPressedItem(
  indicator: HTMLElement,
  onReadyChange: (ready: boolean) => void,
  pressedItem = PRESSED_ITEM
) {
  const group = indicator.parentElement
  if (!group) return

  const place = () => {
    const item = group.querySelector<HTMLElement>(pressedItem)
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
      revealItem(group, group.querySelector<HTMLElement>(':focus') ?? item)
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
