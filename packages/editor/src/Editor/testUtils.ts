import { screen } from '@testing-library/react'
import { expect, onTestFinished } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

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

/** Safari's Enter that picks an IME candidate, sent after compositionend. */
export function enterEndingComposition(field: Element) {
  field.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      keyCode: 229,
      bubbles: true,
      cancelable: true
    })
  )
}

// The popup helpers below mirror components' css/testUtils.ts, which the
// editor can't import (INNO-1649).

// Headless WebKit on Linux runs no frames while a page sits idle, so
// requestAnimationFrame, ResizeObserver and CSS animations stall until the
// pointer moves (docs/solutions/test-failures/
// linux-webkit-no-frames-while-idle.md). Wiggles the pointer a pixel in the
// corner about once a frame until stopped, or until the test finishes.
function keepFramesRunning() {
  let running = true
  const wiggling = (async () => {
    for (let step = 0; running; step++) {
      await commands.pointer([
        { type: 'move', x: step % 2, y: 0 },
        // Paces the wiggle to a frame: frames can't, as they're what it wakes.
        // eslint-disable-next-line roadie/no-fixed-sleep
        { type: 'wait', ms: 16 }
      ])
    }
  })()
  wiggling.catch(() => {})
  const stop = async () => {
    running = false
    await wiggling
  }
  onTestFinished(stop)
  return stop
}

/** Runs a wait that only frames can end, such as an exit animation unmounting a popup, with frames kept running. */
export async function withFrames<T>(wait: () => Promise<T>) {
  const stop = keepFramesRunning()
  try {
    return await wait()
  } finally {
    // A pointer error here mustn't hide why the wait failed.
    await stop().catch(() => {})
  }
}

type Name = string | RegExp

/** Waits for every popup with `role` on the page to unmount, as Base UI keeps a closed one mounted, inert, until its exit ends. */
export const waitPopupGone = (role: 'listbox' | 'menu' = 'menu') =>
  withFrames(() =>
    expect
      .poll(() => screen.queryAllByRole(role), {
        message: `A ${role} is still open. Pass staysOpen for a pick that leaves it open.`
      })
      .toHaveLength(0)
  )

type Pick = {
  /** The control that opens the popup. Leave out whenever it's already open, as a click on its trigger would close it. */
  from?: Element
  /** For a pick that leaves its popup open. */
  staysOpen?: boolean
}
type Clicker = { click: (element: Element) => Promise<unknown> }

// Base UI opens a popup from a press in a frame, and Linux WebKit runs no
// frames while idle, so an item found without frames running can belong to
// the popup that's still closing, and clicking it fails on
// `pointer-events: none`. So the find runs with frames, and the pick waits
// for the popup to go.
async function pick(
  user: Clicker,
  { from, staysOpen }: Pick,
  role: 'option' | 'menuitem' | 'menuitemradio' | 'menuitemcheckbox',
  name: Name
) {
  if (from) await user.click(from)
  const found = await withFrames(() => screen.findByRole(role, { name }))
  await user.click(found)
  if (!staysOpen) await waitPopupGone(role === 'option' ? 'listbox' : 'menu')
}

/** Picks a Select or Combobox option, then, unless it `staysOpen`, waits for every listbox to go. */
export const pickOption = (
  user: Clicker,
  { option, ...rest }: Pick & { option: Name }
) => pick(user, rest, 'option', option)

/** Picks a menu item (`role` for a radio or checkbox one), then, unless it `staysOpen`, waits for every menu to go. */
export const pickMenuItem = (
  user: Clicker,
  {
    item,
    role = 'menuitem',
    ...rest
  }: Pick & {
    item: Name
    role?: 'menuitem' | 'menuitemradio' | 'menuitemcheckbox'
  }
) => pick(user, rest, role, item)
