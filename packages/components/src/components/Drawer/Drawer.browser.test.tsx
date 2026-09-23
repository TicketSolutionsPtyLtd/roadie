import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Drawer } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(() => cleanup())

async function openBottom() {
  render(
    <Drawer defaultOpen>
      <Drawer.Content>
        <Drawer.Title>Your tickets</Drawer.Title>
      </Drawer.Content>
    </Drawer>
  )
  return (await screen.findByRole('dialog')).getBoundingClientRect()
}

describe('a bottom drawer', () => {
  it('runs edge to edge on a phone', async () => {
    await page.viewport(390, 844)
    const popup = await openBottom()

    expect(popup.left).toBe(0)
    expect(popup.width).toBe(390)
  })

  it('caps at the cart drawer width and centres in a wide window', async () => {
    await page.viewport(1280, 800)
    const popup = await openBottom()

    expect(popup.width).toBe(576)
    expect(popup.left).toBeCloseTo((1280 - 576) / 2, 0)
  })

  it('floats 0.5rem off the bottom edge in a wide window', async () => {
    await page.viewport(1280, 800)
    const popup = await openBottom()

    expect(800 - popup.bottom).toBeCloseTo(8, 0)
  })

  it('starts clear of the window, float included', async () => {
    await page.viewport(1280, 800)
    render(
      <Drawer defaultOpen>
        <Drawer.Content>
          <Drawer.Title>Your tickets</Drawer.Title>
        </Drawer.Content>
      </Drawer>
    )
    const popup = await screen.findByRole('dialog')
    popup.setAttribute('data-starting-style', '')
    popup.style.transition = 'none'

    expect(popup.getBoundingClientRect().top).toBeGreaterThanOrEqual(800)
  })
})

describe('a drawer body', () => {
  function openLong(rows = 60) {
    render(
      <Drawer defaultOpen>
        <Drawer.Content>
          <Drawer.Title>Your tickets</Drawer.Title>
          <Drawer.Body>
            {Array.from({ length: rows }, (_, index) => (
              <p key={index}>General admission {index + 1}</p>
            ))}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    )
    return screen.findByRole('dialog')
  }

  const body = () =>
    document.querySelector<HTMLElement>('[data-slot="drawer-body"]')!

  it('sizes the drawer to short content', async () => {
    await page.viewport(390, 844)
    const popup = await openLong(2)

    expect(body().scrollHeight).toBe(body().clientHeight)
    expect(popup.getBoundingClientRect().height).toBeLessThan(844 * 0.5)
  })

  it('caps the drawer and scrolls long content inside the body', async () => {
    await page.viewport(390, 844)
    const popup = await openLong()

    expect(popup.getBoundingClientRect().height).toBeLessThanOrEqual(
      844 * 0.75 + 1
    )
    expect(body().scrollHeight).toBeGreaterThan(body().clientHeight)
    body().scrollTop = 200
    expect(body().scrollTop).toBe(200)
  })

  // Base UI reads a touch swipe from touch events, which only Chromium lets a page construct.
  const canTouch = (() => {
    try {
      new Touch({ identifier: 0, target: document.body })
      return true
    } catch {
      return false
    }
  })()

  async function swipeDown(from: Element, distance: number) {
    const { left, top, width } = from.getBoundingClientRect()
    const x = left + width / 2
    const at = (type: string, y: number) => {
      const touch = new Touch({
        identifier: 1,
        target: from,
        clientX: x,
        clientY: y
      })
      const touches = type === 'touchend' ? [] : [touch]
      from.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches,
          targetTouches: touches,
          changedTouches: [touch]
        })
      )
    }
    at('touchstart', top + 20)
    for (let step = 1; step <= 10; step++) {
      at('touchmove', top + 20 + (distance * step) / 10)
      await new Promise(requestAnimationFrame)
    }
    at('touchend', top + 20 + distance)
    await new Promise((settle) => setTimeout(settle, 600))
  }

  it.runIf(canTouch)(
    'dismisses on a swipe down from the top of the body',
    async () => {
      await page.viewport(390, 844)
      await openLong()

      await swipeDown(body().querySelector('p')!, 300)

      expect(screen.queryByRole('dialog')).toBeNull()
    }
  )

  it.runIf(canTouch)(
    'stays open when a swipe in a scrolled body is a scroll',
    async () => {
      await page.viewport(390, 844)
      await openLong()
      body().scrollTop = 400

      await swipeDown(body().querySelectorAll('p')[20]!, 300)

      expect(screen.queryByRole('dialog')).not.toBeNull()
    }
  )
})
