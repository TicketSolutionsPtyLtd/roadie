type Keydown = Pick<KeyboardEvent, 'key' | 'isComposing' | 'keyCode'>

/**
 * Whether a keydown is the Enter that picks an IME candidate, which only ends
 * the composition. Safari sends it after compositionend, so `isComposing` is
 * false and only the legacy keyCode 229 marks it.
 */
export function isImeEnter(event: Keydown) {
  return event.key === 'Enter' && (event.isComposing || event.keyCode === 229)
}
