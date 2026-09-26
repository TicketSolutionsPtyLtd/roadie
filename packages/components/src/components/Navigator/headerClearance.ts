// Toast reads this; Navigator writes it, so Toast never imports Pane. Not the
// public offset: that stays the app's, and adds to this.
const CLEAR_TOP = '--toast-viewport-clear-top'

const shown = (header: HTMLElement, box: DOMRect) =>
  box.height > 0 &&
  box.bottom > 0 &&
  box.right > 0 &&
  box.left < window.innerWidth &&
  (header.checkVisibility?.({
    visibilityProperty: true,
    opacityProperty: true
  }) ??
    true)

// A pane inside a pane's content scrolls with it, so its header isn't top chrome.
const isFramePane = (header: HTMLElement) => {
  const pane = header.closest('[data-slot="pane"]')
  return (
    pane !== null && pane.parentElement?.closest('[data-slot="pane"]') === null
  )
}

/** Publishes how far the frame's pane headers reach down the viewport, so top toasts sit below them. */
export function createHeaderClearance() {
  const headers = new Set<HTMLElement>()
  let resize: ResizeObserver | null = null
  let frame = 0

  const measure = () => {
    frame = 0
    let edge = 0
    for (const header of headers) {
      const box = header.getBoundingClientRect()
      if (isFramePane(header) && shown(header, box))
        edge = Math.max(edge, box.bottom)
    }
    const root = document.documentElement.style
    if (edge > 0) root.setProperty(CLEAR_TOP, `${edge}px`)
    else root.removeProperty(CLEAR_TOP)
  }

  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(measure)
  }

  const track = (header: HTMLElement) => {
    headers.add(header)
    resize?.observe(header)
    schedule()
    return () => {
      headers.delete(header)
      resize?.unobserve(header)
      schedule()
    }
  }

  // Resizes catch a collapsing header; transitions and animations catch panes moving.
  const start = (frameElement: HTMLElement) => {
    resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule)
    resize?.observe(frameElement)
    for (const header of headers) resize?.observe(header)
    window.addEventListener('resize', schedule)
    frameElement.addEventListener('transitionend', schedule)
    frameElement.addEventListener('transitioncancel', schedule)
    frameElement.addEventListener('animationend', schedule)
    frameElement.addEventListener('animationcancel', schedule)
    schedule()
    return () => {
      resize?.disconnect()
      resize = null
      window.removeEventListener('resize', schedule)
      frameElement.removeEventListener('transitionend', schedule)
      frameElement.removeEventListener('transitioncancel', schedule)
      frameElement.removeEventListener('animationend', schedule)
      frameElement.removeEventListener('animationcancel', schedule)
      cancelAnimationFrame(frame)
      frame = 0
      document.documentElement.style.removeProperty(CLEAR_TOP)
    }
  }

  return { track, start, refresh: schedule }
}

export type HeaderClearance = ReturnType<typeof createHeaderClearance>
