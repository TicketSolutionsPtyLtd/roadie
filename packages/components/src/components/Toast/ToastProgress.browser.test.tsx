import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { Toast, type ToastPosition, createToastManager } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
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
afterEach(async () => {
  await commands.reduceMotion(false)
  await userEvent.unhover(document.body)
  cleanup()
})

const toast = () => document.querySelector<HTMLElement>('[data-slot="toast"]')!
const bar = () =>
  document.querySelector<HTMLElement>('[data-slot="toast-progress"]')!
const width = () => bar().getBoundingClientRect().width
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
      await waitFor(
        () => expect(toast()).not.toHaveAttribute('data-starting-style'),
        { timeout: 10_000 }
      )
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
    await pause(800)
    expect(width()).toBeLessThan(start)
  })

  it('holds still while the toasts are hovered, then carries on', async () => {
    await show(6000)
    await pause(300)
    await userEvent.hover(toast())
    await waitFor(() => expect(toast()).toHaveAttribute('data-expanded'), {
      timeout: 10_000
    })
    const held = width()
    await pause(600)
    expect(width()).toBeCloseTo(held, 0)

    await userEvent.unhover(toast())
    await waitFor(() => expect(toast()).not.toHaveAttribute('data-expanded'), {
      timeout: 10_000
    })
    await pause(600)
    expect(width()).toBeLessThan(held - 1)
  })

  it('runs out as the toast leaves, pause included', async () => {
    await show(2000)
    const animation = bar().getAnimations()[0]!
    await pause(500)
    await userEvent.hover(toast())
    await pause(700)
    await userEvent.unhover(toast())

    const barDone = animation.finished.then(() => performance.now())
    const toastLeaving = waitFor(
      () => {
        expect(toast()).toHaveAttribute('data-ending-style')
        return performance.now()
      },
      { timeout: 10_000, interval: 10 }
    )
    const [done, leaving] = await Promise.all([barDone, toastLeaving])

    expect(Math.abs(leaving - done)).toBeLessThan(400)
  })

  it('hides under reduced motion rather than snapping empty', async () => {
    await commands.reduceMotion(true)
    await show(4000)
    expect(getComputedStyle(bar()).display).toBe('none')
  })
})
