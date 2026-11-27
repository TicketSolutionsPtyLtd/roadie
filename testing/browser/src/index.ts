import { screen, within } from '@testing-library/react'
import { expect, onTestFinished } from 'vitest'
import { commands } from 'vitest/browser'

type Point = { x: number; y: number }

const CORNER: Point = { x: 0, y: 0 }

// Where frames are kept running from unless a test says otherwise: the last
// element a pick clicked, as a submenu opened by hover closes when the pointer
// leaves it, and the corner otherwise.
let pointerAt = CORNER

function pointTo(element: Element) {
  const { left, top, width, height } = element.getBoundingClientRect()
  pointerAt = {
    x: Math.round(left + width / 2),
    y: Math.round(top + height / 2)
  }
  onTestFinished(() => {
    pointerAt = CORNER
  })
}

// Headless WebKit on Linux runs no frames while a page sits idle, so
// requestAnimationFrame, ResizeObserver and CSS animations stall until the
// pointer moves (docs/solutions/test-failures/
// linux-webkit-no-frames-while-idle.md). Wiggles the pointer a pixel at `at()`
// about once a frame until stopped, or until the test finishes.
export function keepFramesRunning(at: () => Point = () => pointerAt) {
  let running = true
  const wiggling = (async () => {
    for (let step = 0; running; step++) {
      const { x, y } = at()
      await commands.pointer([
        { type: 'move', x: x + (step % 2), y },
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

/** Runs a wait that only frames can end, such as a transition settling or an exit animation unmounting a popup, with frames kept running. */
export async function withFrames<T>(wait: () => Promise<T>) {
  const stop = keepFramesRunning()
  try {
    return await wait()
  } finally {
    // A pointer error here mustn't hide why the wait failed.
    await stop().catch(() => {})
  }
}

type Clicker = { click: (element: Element) => Promise<unknown> }
type Name = string | RegExp
/** The control that opens the popup, or its name inside a panel. */
type Opener = Element | { panel: HTMLElement; name: Name }
type MenuRole = 'menuitem' | 'menuitemradio' | 'menuitemcheckbox'

type Pick = {
  /** Leave out whenever the popup is already open, say from typing, as a click on its trigger would close it. */
  from?: Opener
  /** For a pick that leaves its popup open, such as a multiple select. */
  staysOpen?: boolean
}

/**
 * Waits for every popup with `role` on the page to unmount, as a picked
 * submenu item's parent menu closes too. Base UI keeps a closed popup mounted,
 * its positioner inert, until its exit transition ends.
 */
export const waitPopupGone = (role: 'listbox' | 'menu' = 'listbox') =>
  withFrames(() =>
    expect
      .poll(() => screen.queryAllByRole(role), {
        message: `A ${role} is still open. Pass staysOpen for a pick that leaves it open.`
      })
      .toHaveLength(0)
  )

// Base UI opens a popup from a press in a frame, and Linux WebKit runs no
// frames while idle, so an item found without frames running can belong to
// the popup that's still closing, and clicking it fails on
// `pointer-events: none`. So the find runs with frames, and the pick waits
// for the popup to go.
async function pick(
  user: Clicker,
  { from, staysOpen }: Pick,
  opener: 'combobox' | 'button',
  role: 'option' | MenuRole,
  name: Name
) {
  if (from) {
    const trigger =
      from instanceof Element
        ? from
        : await within(from.panel).findByRole(opener, { name: from.name })
    await user.click(trigger)
    pointTo(trigger)
  }
  const found = await withFrames(() => screen.findByRole(role, { name }))
  await user.click(found)
  if (staysOpen) pointTo(found)
  else {
    await waitPopupGone(role === 'option' ? 'listbox' : 'menu')
    pointerAt = CORNER
  }
}

/** Opens a Select or Combobox popup `from` its trigger, picks `option`, and, unless it `staysOpen`, waits for every listbox to go. */
export const pickOption = (
  user: Clicker,
  { option, ...rest }: Pick & { option: Name }
) => pick(user, rest, 'combobox', 'option', option)

/** Opens a menu `from` its trigger button, picks `item` (pass `role` for a radio or checkbox one), and, unless it `staysOpen`, waits for every menu to go. */
export const pickMenuItem = (
  user: Clicker,
  { item, role = 'menuitem', ...rest }: Pick & { item: Name; role?: MenuRole }
) => pick(user, rest, 'button', role, item)
