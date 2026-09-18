// Where a pane was scrolled to, filed under the history entry it was scrolled on.

type NavigationLike = { currentEntry?: { key?: string } | null }

/** The Navigation API's id for this entry, stable across traversals; null without the API. */
export function historyEntryKey(): string | null {
  if (typeof window === 'undefined') return null
  const navigation = (window as { navigation?: NavigationLike }).navigation
  return navigation?.currentEntry?.key ?? null
}

// A session's worth of going back, not a log. Least recently written goes first.
const MOST_ENTRIES = 30

const byEntry = new Map<string, Map<string, number>>()

export function rememberPaneScroll(entry: string, seat: string, top: number) {
  const seats = byEntry.get(entry) ?? new Map<string, number>()
  byEntry.delete(entry)
  seats.set(seat, top)
  byEntry.set(entry, seats)
  while (byEntry.size > MOST_ENTRIES) {
    const oldest = byEntry.keys().next()
    if (oldest.done) break
    byEntry.delete(oldest.value)
  }
}

export function recallPaneScroll(entry: string, seat: string) {
  return byEntry.get(entry)?.get(seat)
}

/** Test seam; a real session only ever grows to `MOST_ENTRIES`. */
export function forgetPaneScroll() {
  byEntry.clear()
}

// A page grows over its first frames; until then the viewport clamps the scroll.
const SETTLE_FRAMES = 10

const GIVES_UP_ON = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

/** Holds `viewport` at `top` while the page grows; stops on user input or the returned cancel. */
export function restorePaneScroll(viewport: HTMLElement, top: number) {
  viewport.scrollTop = top
  if (viewport.scrollTop === top) return () => {}

  let frame = 0
  let frames = 0
  const stop = () => {
    cancelAnimationFrame(frame)
    for (const type of GIVES_UP_ON) viewport.removeEventListener(type, stop)
  }
  for (const type of GIVES_UP_ON) {
    viewport.addEventListener(type, stop, { passive: true })
  }
  const again = () => {
    viewport.scrollTop = top
    frames += 1
    if (viewport.scrollTop === top || frames >= SETTLE_FRAMES) return stop()
    frame = requestAnimationFrame(again)
  }
  frame = requestAnimationFrame(again)
  return stop
}
