import type { KeyboardEvent } from 'react'

/**
 * Makes the Enter key activate an overlay's primary action — the single
 * strong-emphasis button (e.g. "Save changes", "Delete") — the way Enter
 * submits a form's default button. Per the overlay guidelines there is at
 * most one strong button per popup, so it unambiguously identifies the
 * primary action whatever its intent.
 *
 * Wire it to the keydown handler of a Dialog/Popover popup. Enter is left
 * alone when focus is on a control that handles it itself (another
 * button/link, a multi-line textarea, or editable content) so the default
 * behaviour of the focused element wins.
 */
export function triggerPrimaryActionOnEnter(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Enter' || event.defaultPrevented) return
  // Don't fire mid-IME-composition (e.g. selecting a kanji candidate).
  if (event.nativeEvent.isComposing) return

  const target = event.target as HTMLElement
  if (
    target.tagName === 'BUTTON' ||
    target.tagName === 'A' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    return
  }

  // Scope to actionable elements — a strong-emphasis decorative element
  // (e.g. an `<IconTile emphasis='strong'>` in a Dialog header) carries the
  // same `.emphasis-strong` class but isn't a primary action; matching it
  // would swallow Enter and never reach the real button.
  const primary = event.currentTarget.querySelector<HTMLElement>(
    ':is(button, a, [role="button"]).emphasis-strong'
  )
  // `<a>` / `[role=button]` can't carry the native `disabled` attribute, so
  // also honour the ARIA / Base UI disabled signals a styled button uses.
  if (
    !primary ||
    (primary as HTMLButtonElement).disabled ||
    primary.getAttribute('aria-disabled') === 'true' ||
    primary.hasAttribute('data-disabled')
  ) {
    return
  }

  event.preventDefault()
  primary.click()
}
