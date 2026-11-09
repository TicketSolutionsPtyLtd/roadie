import { useMediaQuery } from './toolbarMode'

/** Whether the page is wide enough to keep the editor in view beside a drawer. */
export const useRoomBeside = () => useMediaQuery('(min-width: 1280px)')

type RoomOptions = {
  /** Kept clear between the content and the popup. */
  gap?: number
  /** What was edited, which stays where it was on screen as the page reflows. */
  kept?: Element | null
}

/**
 * Pads `root`'s end by as much of it as `popup`, pinned to the page's end,
 * covers, on top of its own padding, until the returned cleanup. The editor's
 * own box, not ProseMirror's, so the selection never sees it.
 */
export function makeRoomBeside(
  root: HTMLElement,
  popup: HTMLElement,
  { gap = 0, kept = null }: RoomOptions = {}
) {
  const page = root.ownerDocument.documentElement
  const view = root.ownerDocument.defaultView ?? window
  // The popup is on the right whatever the direction, so physical padding.
  const previous = root.style.paddingRight
  // offsetWidth ignores the slide in, which a rect would catch midway.
  const fit = () => {
    root.style.paddingRight = previous
    const own = parseFloat(view.getComputedStyle(root).paddingRight) || 0
    const covered =
      root.getBoundingClientRect().right -
      (page.clientWidth - popup.offsetWidth) +
      gap
    if (covered > 0) root.style.paddingRight = `${own + covered}px`
  }
  const before = kept?.getBoundingClientRect().top
  fit()
  // The narrower page reflows, so what was edited goes back under the
  // pointer rather than jumping.
  if (kept && before !== undefined) {
    const moved = kept.getBoundingClientRect().top - before
    if (moved) (root.ownerDocument.scrollingElement ?? page).scrollBy(0, moved)
  }
  const resizes = new ResizeObserver(fit)
  resizes.observe(root.parentElement ?? page)
  view.addEventListener('resize', fit)
  return () => {
    resizes.disconnect()
    view.removeEventListener('resize', fit)
    root.style.paddingRight = previous
  }
}
