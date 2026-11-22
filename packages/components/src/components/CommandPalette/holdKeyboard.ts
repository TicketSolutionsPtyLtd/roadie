// iOS raises the keyboard only for a focus inside the tap, and the palette's
// field mounts after it. A field focused now keeps the keyboard up until focus
// moves on to the real one.
export function holdKeyboard(doc: Document, returnTo: HTMLElement | null) {
  const standIn = doc.createElement('input')
  standIn.setAttribute('aria-hidden', 'true')
  standIn.tabIndex = -1
  // 16px stops iOS zooming in on the focused field.
  standIn.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none'
  doc.body.append(standIn)
  standIn.focus({ preventScroll: true })
  const release = () => standIn.remove()
  standIn.addEventListener('blur', release, { once: true })
  // The palette may never take focus, as when the app cancels the open, so
  // focus goes back rather than holding the keyboard up over nothing.
  setTimeout(() => {
    if (doc.activeElement === standIn) returnTo?.focus({ preventScroll: true })
    release()
  }, 2000)
}

export const isCoarsePointer = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(pointer: coarse)').matches === true
