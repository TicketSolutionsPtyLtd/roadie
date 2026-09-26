import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

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
  cleanup()
})

const SPRING_PEAK = '1.094'
const EASE_EXIT = 'cubic-bezier(0.4, 0, 1, 1)'
const EASE_ENTER = 'cubic-bezier(0, 0, 0.2, 1)'

function show(position?: ToastPosition) {
  const manager = createToastManager()
  render(
    <Toast.Provider toastManager={manager}>
      <Toast.Viewport position={position} />
    </Toast.Provider>
  )
  act(() => {
    manager.add({ title: 'Link copied', timeout: 0 })
  })
  return () => document.querySelector<HTMLElement>('[data-slot="toast"]')
}

// Browsers collapse a repeated list to one value, so expand it per property.
function perProperty(list: string) {
  const values = list.split(/,\s*(?=[a-z\d.])(?![^(]*\))/)
  return Array.from({ length: 3 }, (_, index) => values[index % values.length])
}

function seconds(list: string) {
  return perProperty(list).map((value) => Number.parseFloat(value!))
}

function transformTransition(toast: HTMLElement) {
  return toast
    .getAnimations()
    .find(
      (animation): animation is CSSTransition =>
        animation instanceof CSSTransition &&
        animation.transitionProperty === 'transform'
    )
}

describe('toast motion', () => {
  it('springs transforms and eases opacity and height', async () => {
    const toast = show()
    await waitFor(() => expect(toast()).not.toBeNull())
    const style = getComputedStyle(toast()!)

    expect(style.transitionProperty).toBe('transform, opacity, height')
    expect(style.transitionTimingFunction).toMatch(/^linear\(/)
    expect(style.transitionTimingFunction).toContain(SPRING_PEAK)
    expect(
      style.transitionTimingFunction.endsWith(`${EASE_ENTER}, ${EASE_ENTER}`)
    ).toBe(true)
    expect(seconds(style.transitionDuration)).toEqual([0.4, 0.4, 0.15])
  })

  it('leaves quickly on the exit easing', async () => {
    const toast = show()
    await waitFor(() => expect(toast()).not.toBeNull())
    toast()!.setAttribute('data-ending-style', '')
    const style = getComputedStyle(toast()!)

    expect(perProperty(style.transitionTimingFunction)).toEqual([
      EASE_EXIT,
      EASE_EXIT,
      EASE_EXIT
    ])
    expect(seconds(style.transitionDuration)).toEqual([0.3, 0.3, 0.15])
  })

  it.each([
    ['bottom-end', -1],
    ['top-center', 1]
  ] as const)(
    'overshoots its resting place on the way in from the %s edge',
    async (position, away) => {
      const toast = show(position)
      const transition = await waitFor(
        () => {
          const found = transformTransition(toast()!)
          expect(found).toBeDefined()
          return found!
        },
        { timeout: 10_000 }
      )
      transition.pause()
      transition.currentTime = 400 * 0.4
      const peak = toast()!.getBoundingClientRect().top
      transition.finish()
      const rest = toast()!.getBoundingClientRect().top

      expect((peak - rest) * away).toBeGreaterThan(3)
    }
  )

  it('drops the spring under reduced motion', async () => {
    await commands.reduceMotion(true)
    const toast = show()
    await waitFor(() => expect(toast()).not.toBeNull())

    for (const duration of seconds(
      getComputedStyle(toast()!).transitionDuration
    )) {
      expect(duration).toBeLessThan(0.001)
    }
  })
})
