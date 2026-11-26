const covers = new WeakMap<Element, () => void>()

const isSlide = (event: TransitionEvent) =>
  event.target === event.currentTarget && event.propertyName === 'translate'

/** Lets a pane take taps again at once, as when it comes back mid-slide. */
export function uncover(pane: Element | null) {
  if (pane) covers.get(pane)?.()
}

/** Keeps taps off a pane sliding away; `pointer-events` would restyle its subtree (INNO-1706). */
export function coverWhileLeaving(pane: HTMLElement) {
  uncover(pane)
  // Not a data-slot, which many :has() arguments name, so inserting it invalidates none of them.
  const cover = document.createElement('div')
  cover.setAttribute('data-pane-tap-cover', '')
  cover.setAttribute('aria-hidden', 'true')
  pane.append(cover)
  let frame = 0
  let sliding = false
  const onRun = (event: TransitionEvent) => {
    if (isSlide(event)) sliding = true
  }
  const onEnd = (event: TransitionEvent) => {
    if (isSlide(event)) remove()
  }
  const remove = () => {
    cancelAnimationFrame(frame)
    cover.remove()
    pane.removeEventListener('transitionrun', onRun)
    pane.removeEventListener('transitionend', onEnd)
    pane.removeEventListener('transitioncancel', onEnd)
    if (covers.get(pane) === remove) covers.delete(pane)
  }
  covers.set(pane, remove)
  pane.addEventListener('transitionrun', onRun)
  pane.addEventListener('transitionend', onEnd)
  pane.addEventListener('transitioncancel', onEnd)
  // Events, not getAnimations(), which would force a style pass mid-push. With no slide, the pane is hidden or in view.
  const wait = (frames: number) => {
    frame = requestAnimationFrame(() => {
      if (frames > 1) wait(frames - 1)
      else if (!sliding) remove()
    })
  }
  wait(3)
}
