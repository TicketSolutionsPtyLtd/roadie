import type { CSSProperties } from 'react'

import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Toast, type ToastPosition, createToastManager } from '.'
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
const rect = (element: HTMLElement | undefined) =>
  element!.getBoundingClientRect()
const byIndex = (list: HTMLElement[]) =>
  [...list].sort(
    (a, b) =>
      Number(a.style.getPropertyValue('--toast-index')) -
      Number(b.style.getPropertyValue('--toast-index'))
  )

async function stack(
  titles: string[],
  position?: ToastPosition,
  style?: CSSProperties
) {
  const manager = createToastManager()
  render(
    <Toast.Provider toastManager={manager}>
      <Toast.Viewport position={position} style={style} />
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

const WIDE = { width: 1280, height: 800, edge: 24, toastWidth: 384 }
const PHONE = { width: 390, height: 844, edge: 16 }

describe('the toast viewport on a wide window', () => {
  it.each([
    ['bottom-end', 'end'],
    ['bottom-center', 'center'],
    ['top-end', 'end'],
    ['top-center', 'center']
  ] as const)('places a %s toast', async (position, align) => {
    await page.viewport(WIDE.width, WIDE.height)
    const box = rect((await stack(['Saved'], position))[0])

    expect(box.width).toBeCloseTo(WIDE.toastWidth, 0)
    if (align === 'end') {
      expect(WIDE.width - box.right).toBeCloseTo(WIDE.edge, 0)
    } else {
      expect(box.left).toBeCloseTo((WIDE.width - WIDE.toastWidth) / 2, 0)
    }
    if (position.startsWith('top')) {
      expect(box.top).toBeCloseTo(WIDE.edge, 0)
    } else {
      expect(WIDE.height - box.bottom).toBeCloseTo(WIDE.edge, 0)
    }
  })
})

describe('the toast viewport on a phone', () => {
  it.each(['bottom-end', 'bottom-center', 'top-end', 'top-center'] as const)(
    'spans the %s edge inside a 1rem gutter',
    async (position) => {
      await page.viewport(PHONE.width, PHONE.height)
      const box = rect((await stack(['Saved'], position))[0])

      expect(box.left).toBeCloseTo(PHONE.edge, 0)
      expect(box.right).toBeCloseTo(PHONE.width - PHONE.edge, 0)
      if (position.startsWith('top')) {
        expect(box.top).toBeCloseTo(PHONE.edge, 0)
      } else {
        expect(PHONE.height - box.bottom).toBeCloseTo(PHONE.edge, 0)
      }
    }
  )
})

describe('the viewport offset', () => {
  it('lifts a bottom stack clear of fixed UI', async () => {
    await page.viewport(WIDE.width, WIDE.height)
    const box = rect(
      (
        await stack(['Saved'], 'bottom-end', {
          '--toast-viewport-offset-bottom': '80px'
        } as CSSProperties)
      )[0]
    )
    expect(WIDE.height - box.bottom).toBeCloseTo(WIDE.edge + 80, 0)
  })

  it('drops a top stack below fixed UI', async () => {
    await page.viewport(PHONE.width, PHONE.height)
    const box = rect(
      (
        await stack(['Saved'], 'top-center', {
          '--toast-viewport-offset-top': '64px'
        } as CSSProperties)
      )[0]
    )
    expect(box.top).toBeCloseTo(PHONE.edge + 64, 0)
  })
})

describe('a collapsed stack', () => {
  it('tucks older toasts behind the newest, peeking out above it', async () => {
    await page.viewport(WIDE.width, WIDE.height)
    const [newest, older, oldest] = byIndex(
      await stack(['Oldest', 'Older', 'Newest'])
    )

    expect(rect(older).top).toBeLessThan(rect(newest).top)
    expect(rect(oldest).top).toBeLessThan(rect(older).top)
    expect(rect(older).bottom).toBeLessThanOrEqual(rect(newest).bottom)
    expect(rect(older).width).toBeLessThan(rect(newest).width)
    expect(rect(newest).top - rect(oldest).top).toBeLessThan(40)
  })

  it('peeks out below the newest from a top edge', async () => {
    await page.viewport(WIDE.width, WIDE.height)
    const [newest, older, oldest] = byIndex(
      await stack(['Oldest', 'Older', 'Newest'], 'top-end')
    )

    expect(rect(older).bottom).toBeGreaterThan(rect(newest).bottom)
    expect(rect(oldest).bottom).toBeGreaterThan(rect(older).bottom)
    expect(rect(older).top).toBeGreaterThanOrEqual(rect(newest).top)
    expect(rect(older).width).toBeLessThan(rect(newest).width)
    expect(rect(oldest).bottom - rect(newest).bottom).toBeLessThan(40)
  })
})

describe('an expanded stack', () => {
  it.each(['bottom-end', 'top-end'] as const)(
    'fans every %s toast out with a gap between them',
    async (position) => {
      await page.viewport(WIDE.width, WIDE.height)
      const list = await stack(['Oldest', 'Older', 'Newest'], position)
      for (const toast of list) toast.setAttribute('data-expanded', '')

      const ordered = byIndex(list)
      const edgeFirst = position.startsWith('top')
        ? ordered
        : [...ordered].reverse()
      for (let index = 1; index < edgeFirst.length; index++) {
        const gap =
          rect(edgeFirst[index]).top - rect(edgeFirst[index - 1]).bottom
        expect(gap).toBeCloseTo(12, 0)
      }
      if (position.startsWith('top')) {
        expect(rect(ordered[0]).top).toBeCloseTo(WIDE.edge, 0)
      }
    }
  )
})

describe('a leaving toast', () => {
  async function leave(direction?: string, position?: ToastPosition) {
    await page.viewport(WIDE.width, WIDE.height)
    const toast = (await stack(['Saved'], position))[0]!
    toast.setAttribute('data-ending-style', '')
    if (direction) toast.setAttribute('data-swipe-direction', direction)
    return rect(toast)
  }

  it('drops off the bottom of the window by default', async () => {
    expect((await leave()).top).toBeGreaterThanOrEqual(WIDE.height - WIDE.edge)
  })

  it('rises off the top of the window from a top edge', async () => {
    expect((await leave(undefined, 'top-center')).bottom).toBeLessThanOrEqual(
      WIDE.edge
    )
  })

  it('leaves to the right when swiped right', async () => {
    expect((await leave('right')).left).toBeGreaterThanOrEqual(
      WIDE.width - WIDE.edge
    )
  })

  it('leaves to the left when swiped left', async () => {
    const box = await leave('left')
    expect(box.right).toBeLessThanOrEqual(
      WIDE.width - WIDE.edge - WIDE.toastWidth + 1
    )
  })

  it('leaves upward when swiped up', async () => {
    const box = await leave('up')
    expect(box.bottom).toBeLessThan(WIDE.height - WIDE.edge - box.height)
  })
})
