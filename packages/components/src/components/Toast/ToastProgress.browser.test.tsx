import { act, cleanup, render, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished
} from 'vitest'
import { commands, page } from 'vitest/browser'

import { Toast, type ToastPosition, createToastManager } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { keepFramesRunning } from '../../css/testUtils'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(1280, 800)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})

const AWAY = { x: 5, y: 5 }
let pointerAt = AWAY
beforeEach(() => {
  pointerAt = AWAY
  keepFramesRunning(() => pointerAt)
})
afterEach(async () => {
  await commands.reduceMotion(false)
  cleanup()
})

const toast = () => document.querySelector<HTMLElement>('[data-slot="toast"]')!
const bar = () =>
  document.querySelector<HTMLElement>('[data-slot="toast-progress"]')!
const width = () => bar().getBoundingClientRect().width
// WebKit commits a CSS pause a frame late, at an earlier time than a read
// taken while it's pending, so the bar can step back once the pause lands.
const pausedWidth = async () => {
  await bar().getAnimations()[0]!.ready
  return width()
}
const frames = async (count: number) => {
  for (let frame = 0; frame < count; frame++)
    await new Promise(requestAnimationFrame)
}

// A toast still moving in can slide out from under the pointer.
const landed = () =>
  waitFor(
    () => {
      expect(toast()).not.toHaveAttribute('data-starting-style')
      expect(
        toast()
          .getAnimations()
          .filter((animation) => animation.playState === 'running')
      ).toHaveLength(0)
    },
    { timeout: 10_000 }
  )

async function hover(expanded: boolean) {
  const box = toast().getBoundingClientRect()
  pointerAt = expanded
    ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    : AWAY
  await waitFor(
    () =>
      expanded
        ? expect(toast()).toHaveAttribute('data-expanded')
        : expect(toast()).not.toHaveAttribute('data-expanded'),
    { timeout: 10_000 }
  )
}

async function show(timeout: number, position?: ToastPosition) {
  const manager = createToastManager()
  render(
    <Toast.Provider toastManager={manager}>
      <Toast.Viewport position={position} />
    </Toast.Provider>
  )
  act(() => {
    manager.add({ title: 'Link copied', timeout })
  })
  await waitFor(() => expect(bar()).not.toBeNull(), { timeout: 10_000 })
}

describe('Toast.Progress', () => {
  it.each(['bottom-end', 'top-center'] as const)(
    'runs along the bottom inside edge of a %s toast',
    async (position) => {
      await show(10_000, position)
      await landed()
      const box = toast().getBoundingClientRect()
      const line = bar().getBoundingClientRect()

      expect(line.height).toBeCloseTo(2, 0)
      expect(line.bottom).toBeCloseTo(box.bottom, 0)
      expect(line.left).toBeCloseTo(box.left, 0)
    }
  )

  it('empties over time', async () => {
    await show(4000)
    const start = width()
    await expect.poll(width, { timeout: 10_000 }).toBeLessThan(start - 1)
  })

  it('holds still while the toasts are hovered, then carries on', async () => {
    await show(6000)
    await landed()
    await hover(true)
    await expect.poll(() => bar().getAnimations()[0]!.playState).toBe('paused')
    const held = await pausedWidth()
    // A running bar moves more than a pixel in ten frames.
    await frames(10)
    expect(width()).toBeCloseTo(held, 0)

    await hover(false)
    await expect.poll(width, { timeout: 1000 }).toBeLessThan(held - 1)
  })

  it('runs out as the toast leaves, pause included', async () => {
    await show(2000)
    const animation = bar().getAnimations()[0]!
    const done = animation.finished.then(
      () => performance.now(),
      () => null
    )
    const element = toast()
    let leaving: number | null = null
    const ending = new MutationObserver(() => {
      if (element.hasAttribute('data-ending-style'))
        leaving ??= performance.now()
    })
    ending.observe(element, { attributeFilter: ['data-ending-style'] })
    onTestFinished(() => ending.disconnect())
    await landed()
    // A twin that never pauses, started with the bar while it still has a
    // start time, finishes where an unpaused bar would have run out.
    const unpaused = document.body.animate(null, { duration: 2000 })
    unpaused.startTime = animation.startTime
    onTestFinished(() => unpaused.cancel())
    await hover(true)
    await unpaused.finished
    expect(animation.playState).toBe('paused')
    await hover(false)

    const left = await waitFor(
      () => {
        expect(leaving).not.toBeNull()
        return leaving!
      },
      { timeout: 10_000 }
    )
    const ranOut = await done
    expect(ranOut, 'the bar did not run out with the toast').not.toBeNull()
    expect(Math.abs(left - ranOut!)).toBeLessThan(400)
  })

  it('hides under reduced motion rather than snapping empty', async () => {
    await commands.reduceMotion(true)
    await show(4000)
    expect(getComputedStyle(bar()).display).toBe('none')
  })
})
