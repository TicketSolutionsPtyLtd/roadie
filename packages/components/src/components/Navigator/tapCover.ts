const covers = new WeakMap<Element, () => void>()

const isSlide = (animation: Animation) =>
  (animation as CSSTransition).transitionProperty === 'translate'

/** Lets a pane take taps again at once, as when it comes back mid-slide. */
export function uncover(pane: Element | null) {
  if (pane) covers.get(pane)?.()
}

/**
 * Covers a pane sliding away, which stays drawn until its slide ends, so a
 * quick second tap can't land on it. A cover, not `pointer-events`, which
 * inherits and would restyle the pane's whole subtree (INNO-1706).
 */
export function coverWhileLeaving(pane: Element) {
  uncover(pane)
  const cover = document.createElement('div')
  cover.dataset.slot = 'pane-tap-cover'
  cover.setAttribute('aria-hidden', 'true')
  pane.append(cover)
  let frame = 0
  const remove = () => {
    cancelAnimationFrame(frame)
    cover.remove()
    if (covers.get(pane) === remove) covers.delete(pane)
  }
  covers.set(pane, remove)
  // The commit's frame starts the slide; with no slide, the pane is hidden or still in view.
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      const slide = pane.getAnimations?.().find(isSlide)
      if (slide) slide.finished.then(remove, remove)
      else remove()
    })
  })
}
