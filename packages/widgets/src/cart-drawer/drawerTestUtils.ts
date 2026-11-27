import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import type { CartClient, CartDetails, CartSummary } from '../cart'

export type DrawerMountProps = {
  cart: CartClient
  collectionId: string
  onNavigate: (href: string) => void
  locale: string
  currency: string
  initialState?: 'open' | 'closed'
  onHeightChange?: (px: number) => void
}

const inTenMinutes = () => new Date(Date.now() + 10 * 60 * 1000).toISOString()

export function cartClient(): CartClient {
  const summary: CartSummary = {
    cartId: 'c1',
    ticketCount: 2,
    cartTotal: 50,
    expiresAtUtc: inTenMinutes(),
    eventIds: ['e1']
  }
  const details: CartDetails = {
    cartId: 'c1',
    collectionName: 'Festival',
    logoUrl: null,
    cartTotal: 50,
    expiresAtUtc: inTenMinutes(),
    extrasUrl: '/outlet/extras/c1',
    events: [
      {
        eventId: 'e1',
        eventName: 'Night Show',
        venueName: 'The Venue',
        eventStartAtUtc: '2026-06-15T10:00:00Z',
        eventDateKey: '2026-06-15',
        tickets: [{ name: 'GA', quantity: 2, priceEach: 25 }],
        subtotal: 50,
        bookingFees: 5,
        total: 55
      }
    ]
  }
  return {
    getSummary: async () => summary,
    getDetails: async () => details,
    checkoutUrl: () => 'https://h.example/outlet/extras/c1',
    removeItem: async () => {}
  }
}

function parts() {
  const drawer = document.getElementById('cart-drawer')
  const body = document.getElementById('cart-drawer-body')?.parentElement
  const header = body?.previousElementSibling
  const footer = body?.nextElementSibling
  if (
    !drawer ||
    !(header instanceof HTMLElement) ||
    !(footer instanceof HTMLElement)
  )
    throw new Error('The drawer is not drawn')
  return { drawer, header, footer }
}

// Layout height, since the drawer scales in on mount.
const heightOf = (el: HTMLElement) => el.offsetHeight

function dockedHeight() {
  const { header, footer } = parts()
  return heightOf(header) + heightOf(footer)
}

// Unrounded, so a spring still easing by a fraction of a pixel isn't at rest.
const drawerHeight = () => parts().drawer.getBoundingClientRect().height

const publishedHeight = () =>
  parseFloat(
    document.documentElement.style.getPropertyValue('--cart-drawer-height')
  )

/** Drags the header with the mouse by dy px (negative is up), over `ms` of clock time. */
async function drag(dy: number, ms: number) {
  const box = parts().header.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  await commands.pointer([{ type: 'move', x, y }, { type: 'down' }])
  vi.advanceTimersByTime(ms)
  await commands.pointer([{ type: 'move', x, y: y + dy }, { type: 'up' }])
}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const pageScrolls = () => getComputedStyle(document.body).overflow !== 'hidden'

const OPEN_AT_1280_BY_800 = 800 - 32

/** One suite for both skins, so they can't drift apart. */
export function describeDrawerGeometry(
  skin: string,
  mount: (props: DrawerMountProps) => () => void
) {
  let unmount = () => {}
  const mountOne = (extra: Partial<DrawerMountProps> = {}) =>
    mount({
      cart: cartClient(),
      collectionId: 'col-1',
      onNavigate: () => {},
      locale: 'en-AU',
      currency: 'AUD',
      ...extra
    })
  const show = async (extra: Partial<DrawerMountProps> = {}) => {
    unmount = mountOne(extra)
    await expect
      .poll(() => document.getElementById('cart-drawer-body'))
      .not.toBeNull()
  }
  // At rest for two frames, so a spring's overshoot or a passing frame doesn't
  // count, and within a pixel, as the parts' offsetHeight rounds.
  const settlesAt = (height: () => number, within = 1) =>
    expect
      .poll(
        async () => {
          const before = drawerHeight()
          await frame()
          await frame()
          const after = drawerHeight()
          return before === after ? Math.abs(after - height()) : Infinity
        },
        { timeout: 3000 }
      )
      .toBeLessThanOrEqual(within)
  const openAt1280By800 = () => OPEN_AT_1280_BY_800
  const settlesDocked = () => settlesAt(publishedHeight)

  let style: HTMLStyleElement
  beforeAll(() => {
    style = document.createElement('style')
    style.textContent = roadieCss
    document.head.append(style)
  })
  afterAll(() => style.remove())
  afterEach(async () => {
    unmount()
    vi.useRealTimers()
    await page.viewport(1280, 800)
  })

  describe(`${skin} CartDrawer geometry`, () => {
    it('docks at its header and footer height, and publishes it to the page and onHeightChange', async () => {
      const reported: number[] = []
      await show({ onHeightChange: (px) => reported.push(px) })
      await expect.poll(dockedHeight).toBeGreaterThan(100)
      await settlesAt(dockedHeight)
      await settlesAt(publishedHeight)
      expect(reported.at(-1)).toBe(publishedHeight())
      expect(pageScrolls()).toBe(true)
    })

    it('starts open when initialState is open and open is omitted', async () => {
      await show({ initialState: 'open' })
      await settlesAt(openAt1280By800)
      expect(page.getByRole('dialog').element()).toBe(parts().drawer)
    })

    it('keeps publishing the docked height while another drawer stays mounted', async () => {
      const unmountOther = mountOne()
      try {
        await show()
        await settlesAt(dockedHeight)
      } finally {
        unmount()
        unmount = unmountOther
      }
      await settlesAt(publishedHeight)
    })

    it('springs up from docked on open, never drawing a frame at full height first', async () => {
      await show()
      await settlesAt(dockedHeight)
      const { drawer } = parts()
      // Every height the drawer is given, so a write a later frame undoes
      // still counts, whichever frame paints.
      const heights: number[] = []
      const watcher = new MutationObserver(() =>
        heights.push(parseFloat(drawer.style.height))
      )
      watcher.observe(drawer, { attributeFilter: ['style'] })
      await userEvent.click(page.getByRole('button', { name: 'Open cart' }))
      await settlesAt(openAt1280By800)
      watcher.disconnect()
      expect(heights.length).toBeGreaterThan(2)
      const drops = heights.slice(1).map((h, i) => heights[i]! - h)
      // The spring overshoots by about 3px; a jump falls back by hundreds.
      expect(Math.max(0, ...drops)).toBeLessThan(10)
    })

    it('hands a still-settling spring over to a drag', async () => {
      await show()
      await settlesAt(dockedHeight)
      vi.useFakeTimers({ toFake: ['Date'] })
      await userEvent.click(page.getByRole('button', { name: 'Open cart' }))
      // In the spring's tail, where the header moves slowly enough to press.
      await expect
        .poll(drawerHeight, { interval: 16 })
        .toBeGreaterThan(OPEN_AT_1280_BY_800 - 20)
      const box = parts().header.getBoundingClientRect()
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      await commands.pointer([{ type: 'move', x, y }, { type: 'down' }])
      vi.advanceTimersByTime(500)
      await commands.pointer([{ type: 'move', x, y: y + 100 }])
      await frame()
      await frame()
      const held = drawerHeight()
      await frame()
      await frame()
      // Held 100px under where the pointer took it, not carried on up to open.
      expect(drawerHeight()).toBe(held)
      expect(held).toBeLessThan(OPEN_AT_1280_BY_800 - 50)
      await commands.pointer([{ type: 'up' }])
      await settlesAt(openAt1280By800)
    })

    it.each([
      { width: 1280, height: 800, open: OPEN_AT_1280_BY_800 },
      { width: 375, height: 700, open: 700 - 30 }
    ])(
      'opens with a tap to fill a $width by $height viewport, locking page scroll until Escape',
      async ({ width, height, open }) => {
        await page.viewport(width, height)
        await show()
        await settlesAt(dockedHeight)

        await userEvent.click(page.getByRole('button', { name: 'Open cart' }))
        await settlesAt(() => open)
        expect(page.getByRole('dialog').element()).toBe(parts().drawer)
        expect(pageScrolls()).toBe(false)

        await userEvent.keyboard('{Escape}')
        await settlesDocked()
        expect(pageScrolls()).toBe(true)
      }
    )

    it.each([
      { from: 'closed', dy: -100, ms: 500, to: 'docked' },
      { from: 'closed', dy: -500, ms: 1000, to: 'open' },
      { from: 'closed', dy: -40, ms: 10, to: 'open' },
      { from: 'open', dy: 100, ms: 500, to: 'open' },
      { from: 'open', dy: 40, ms: 10, to: 'docked' }
    ] as const)(
      'drags from $from by $dy px in $ms ms to rest $to',
      async ({ from, dy, ms, to }) => {
        await show()
        await settlesAt(publishedHeight)
        if (from === 'open') {
          await userEvent.click(page.getByRole('button', { name: 'Open cart' }))
          await settlesAt(openAt1280By800)
        }
        vi.useFakeTimers({ toFake: ['Date'] })
        await drag(dy, ms)
        if (to === 'open') await settlesAt(openAt1280By800)
        else await settlesDocked()
      }
    )
  })
}
