import { expect } from 'vitest'
import { userEvent } from 'vitest/browser'

const MAC = /^(Mac|iP)/.test(navigator.platform)

export const MOD = MAC ? 'Meta' : 'Control'

// Firefox and WebKit on macOS leave the caret where it is on Home and End.
export const LINE_START = MAC ? '{Meta>}{ArrowLeft}{/Meta}' : '{Home}'
export const LINE_END = MAC ? '{Meta>}{ArrowRight}{/Meta}' : '{End}'

// ProseMirror resets the DOM selection 20ms after the editor takes focus, and
// in Firefox that drops Shift+Arrow moves it hasn't read yet. On a triple
// click ProseMirror selects the paragraph itself, so nothing is dropped.
export const selectParagraph = (text: Element) => userEvent.tripleClick(text)

/**
 * Clicks into the editor and resolves once ProseMirror has synced its
 * selection after taking focus, so caret keys pressed next stand.
 *
 * Its focus handler writes ProseMirror's selection back over the DOM 20ms
 * later, undoing moves it hasn't read yet; WebKit on Linux reads them late.
 * Timers of equal delay run in the order they're set, and this one is set
 * after its own, so it runs once the sync has.
 */
export async function clickIntoEditor(target: Element) {
  const editor = target.closest<HTMLElement>('[contenteditable="true"]')
  if (!editor) throw new Error('clickIntoEditor needs an element in an editor.')
  const synced =
    editor === document.activeElement
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          editor.addEventListener(
            'focus',
            // Ordered after ProseMirror's own 20ms timer (prosemirror-view
            // 1.42), not a guessed wait.
            // eslint-disable-next-line roadie/no-fixed-sleep
            () => setTimeout(resolve, 20),
            { once: true }
          )
        })
  await userEvent.click(target)
  // A click that never focuses the editor fails here, not on a timeout.
  await expect.poll(() => document.activeElement).toBe(editor)
  await synced
}
