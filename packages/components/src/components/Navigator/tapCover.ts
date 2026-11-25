const covers = new WeakMap<Element, () => void>()

const isSlide = (animation: Animation) =>
  animation instanceof CSSTransition &&
  animation.transitionProperty === 'translate'

/** Lets a pane take taps again at once, as when it comes back mid-slide. */
export function uncover(pane: Element | null) {
  if (pane) covers.get(pane)?.()
}

/** Keeps taps off a pane sliding away; `pointer-events` would restyle its subtree (INNO-1706). */
export function coverWhileLeaving(pane: Element) {
  uncover(pane)
  // Not a data-slot, which many :has() arguments name, so inserting it invalidates none of them.
  const cover = document.createElement('div')
  cover.setAttribute('data-pane-tap-cover', '')
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
