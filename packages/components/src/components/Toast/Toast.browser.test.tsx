import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Toast, createToastManager } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

// The stack transitions for up to --duration-slower; freezing it lets the
// geometry be read straight away, which WebKit on CI is too slow to wait for.
const FREEZE = '[data-slot="toast"] { transition: none !important; }'

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeFreeze = useStylesheet(FREEZE)
  removeStylesheets = () => {
    removeFreeze()
    removeRoadie()
  }
})
afterAll(async () => {
  removeStylesheets()
  await page.viewport(1920, 1080)
})
afterEach(() => cleanup())

const toasts = () => [
  ...document.querySelectorAll<HTMLElement>('[data-slot="toast"]')
]
const viewport = () =>
  document.querySelector<HTMLElement>('[data-slot="toast-viewport"]')!
const rect = (element: HTMLElement | undefined) =>
  element!.getBoundingClientRect()

async function stack(titles: string[]) {
  const manager = createToastManager()
  render(
    <Toast.Provider toastManager={manager}>
      <Toast.Viewport />
    </Toast.Provider>
  )
  for (const title of titles) {
    act(() => {
      manager.add({ title, timeout: 0 })
    })
  }
  await waitFor(
    () => {
      expect(toasts()).toHaveLength(titles.length)
      for (const toast of toasts()) {
        expect(toast).not.toHaveAttribute('data-starting-style')
      }
    },
    { timeout: 10_000 }
  )
  return toasts()
}

describe('the toast viewport', () => {
  it('spans the bottom of a phone inside a 1rem gutter', async () => {
    await page.viewport(390, 844)
    await stack(['Saved'])

    const region = rect(viewport())
    expect(region.left).toBeCloseTo(16, 0)
    expect(region.right).toBeCloseTo(390 - 16, 0)
    expect(844 - region.bottom).toBeCloseTo(16, 0)
  })

  it('sits at the bottom end of a wide window', async () => {
    await page.viewport(1280, 800)
    await stack(['Saved'])

    const region = rect(viewport())
    expect(region.width).toBeCloseTo(384, 0)
    expect(1280 - region.right).toBeCloseTo(24, 0)
    expect(800 - region.bottom).toBeCloseTo(24, 0)
  })
})

describe('a collapsed stack', () => {
  it('tucks older toasts behind the newest, peeking out above it', async () => {
    await page.viewport(1280, 800)
    const [newest, older, oldest] = await stack([
      'Oldest',
      'Older',
      'Newest'
    ]).then((list) =>
      [...list].sort(
        (a, b) =>
          Number(a.style.getPropertyValue('--toast-index')) -
          Number(b.style.getPropertyValue('--toast-index'))
      )
    )

    expect(rect(older).top).toBeLessThan(rect(newest).top)
    expect(rect(oldest).top).toBeLessThan(rect(older).top)
    expect(rect(older).bottom).toBeLessThanOrEqual(rect(newest).bottom)
    expect(rect(older).width).toBeLessThan(rect(newest).width)
    expect(rect(newest).top - rect(oldest).top).toBeLessThan(40)
  })
})

describe('an expanded stack', () => {
  it('fans every toast out with a gap between them', async () => {
    await page.viewport(1280, 800)
    const list = await stack(['Oldest', 'Older', 'Newest'])
    for (const toast of list) toast.setAttribute('data-expanded', '')

    const sorted = [...list].sort((a, b) => rect(b).top - rect(a).top)
    for (let index = 1; index < sorted.length; index++) {
      const gap = rect(sorted[index - 1]).top - rect(sorted[index]).bottom
      expect(gap).toBeCloseTo(12, 0)
    }
  })
})

describe('a leaving toast', () => {
  async function leave(direction?: string) {
    await page.viewport(1280, 800)
    const toast = (await stack(['Saved']))[0]!
    toast.setAttribute('data-ending-style', '')
    if (direction) toast.setAttribute('data-swipe-direction', direction)
    return rect(toast)
  }

  it('drops off the bottom of the window by default', async () => {
    expect((await leave()).top).toBeGreaterThanOrEqual(800 - 24)
  })

  it('leaves to the right when swiped right', async () => {
    expect((await leave('right')).left).toBeGreaterThanOrEqual(1280 - 24)
  })

  it('leaves to the left when swiped left', async () => {
    const box = await leave('left')
    expect(box.right).toBeLessThanOrEqual(1280 - 24 - 384 + 1)
  })

  it('leaves upward when swiped up', async () => {
    const box = await leave('up')
    expect(box.bottom).toBeLessThan(800 - 24 - box.height)
  })
})
