const TRANSPARENT = 'rgba(0, 0, 0, 0)'
const AUTO = 'data-records-surface'

const paintedBehind = (element: HTMLElement) => {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor
    if (color !== TRANSPARENT) return color
  }
  return 'var(--intent-bg-normal)'
}

/**
 * Sticky parts paint the colour behind the records, since `--pane-surface`
 * inherits into cards that paint something else. A surface the consumer sets
 * on or above the records is kept.
 */
function settle(root: HTMLElement) {
  if (root.hasAttribute(AUTO)) root.style.removeProperty('--records-surface')
  if (getComputedStyle(root).getPropertyValue('--records-surface')) {
    root.removeAttribute(AUTO)
    return
  }
  root.setAttribute(AUTO, '')
  root.style.setProperty('--records-surface', paintedBehind(root))
}

/** Settles now and again whenever the theme switches. */
export function watchSurface(root: HTMLElement) {
  settle(root)
  const observer = new MutationObserver(() => settle(root))
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'style']
  })
  return () => observer.disconnect()
}

/** The opaque colour sticky parts paint. */
export const surfaceClass =
  'bg-(--records-surface,var(--pane-surface,var(--intent-bg-normal)))'
