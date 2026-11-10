import { useMediaQuery } from './toolbarMode'

/** Whether the page is wide enough to keep the editor in view beside a drawer. */
export const useRoomBeside = () => useMediaQuery('(min-width: 1280px)')

type RoomOptions = {
  /** Kept clear between the content and the popup. */
  gap?: number
  /** What was edited, which stays where it was on screen as the page reflows. */
  kept?: Element | null
}

type Room = {
  /** The root's own inline padding, from before any room was made. */
  previous: string
  /** Each popup making room, with its gap. */
  popups: Map<HTMLElement, number>
}

// Popups over one another share a room, so it's sized for the widest rather
// than stacked, and outlasts whichever closes first.
const rooms = new WeakMap<HTMLElement, Room>()

function fit(root: HTMLElement, { previous, popups }: Room) {
  const page = root.ownerDocument.documentElement
  const view = root.ownerDocument.defaultView ?? window
  // The popup is on the right whatever the direction, so physical padding.
  root.style.paddingRight = previous
  const own = parseFloat(view.getComputedStyle(root).paddingRight) || 0
  const right = root.getBoundingClientRect().right
  // offsetWidth ignores the slide in, which a rect would catch midway.
  const covered = Math.max(
    0,
    ...[...popups].map(
      ([popup, gap]) => right - (page.clientWidth - popup.offsetWidth) + gap
    )
  )
  if (covered > 0) root.style.paddingRight = `${own + covered}px`
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
  const room = rooms.get(root) ?? {
    previous: root.style.paddingRight,
    popups: new Map()
  }
  rooms.set(root, room)
  room.popups.set(popup, gap)
  const refit = () => fit(root, room)
  const before = kept?.getBoundingClientRect().top
  refit()
  // The narrower page reflows, so what was edited goes back under the
  // pointer rather than jumping.
  if (kept && before !== undefined) {
    const moved = kept.getBoundingClientRect().top - before
    if (moved) (root.ownerDocument.scrollingElement ?? page).scrollBy(0, moved)
  }
  const resizes = new ResizeObserver(refit)
  resizes.observe(root.parentElement ?? page)
  view.addEventListener('resize', refit)
  return () => {
    resizes.disconnect()
    view.removeEventListener('resize', refit)
    room.popups.delete(popup)
    if (room.popups.size > 0) return refit()
    rooms.delete(root)
    root.style.paddingRight = room.previous
  }
}
