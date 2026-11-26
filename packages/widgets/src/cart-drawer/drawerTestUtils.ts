import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { page, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import type { CartClient, CartDetails, CartSummary } from '../cart'

export type DrawerMountProps = {
  cart: CartClient
  collectionId: string
  onNavigate: (href: string) => void
  locale: string
  currency: string
}

const inTenMinutes = () => new Date(Date.now() + 10 * 60 * 1000).toISOString()

function cartClient(): CartClient {
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

const drawerHeight = () => heightOf(parts().drawer)

const publishedHeight = () =>
  parseFloat(
    document.documentElement.style.getPropertyValue('--cart-drawer-height')
  )

/** Drags the header by dy px (negative is up), taking `ms` from press to release. */
function drag(dy: number, ms: number) {
  const { header } = parts()
  const box = header.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  const at = (type: string, clientY: number, target: EventTarget) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        clientX: x,
        clientY
      })
    )
  at('pointerdown', y, header)
  vi.advanceTimersByTime(ms)
  at('pointermove', y + dy, window)
  at('pointerup', y + dy, window)
}

/** One suite for both skins, so they can't drift apart. */
export function describeDrawerGeometry(
  skin: string,
  mount: (props: DrawerMountProps) => () => void
) {
  let unmount = () => {}
  const show = async () => {
    unmount = mount({
      cart: cartClient(),
      collectionId: 'col-1',
      onNavigate: () => {},
      locale: 'en-AU',
      currency: 'AUD'
    })
    await expect
      .poll(() => document.getElementById('cart-drawer-body'))
      .not.toBeNull()
  }
  // Within a pixel, as offsetHeight rounds and the spring ends fractional.
  const settlesAt = (height: () => number) =>
    expect
      .poll(() => Math.abs(drawerHeight() - height()), { timeout: 3000 })
      .toBeLessThanOrEqual(1)
  const viewportOpen = () => 768

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
    it('docks at its header and footer height, and publishes it to the page', async () => {
      await show()
      await expect.poll(dockedHeight).toBeGreaterThan(100)
      await settlesAt(dockedHeight)
      await settlesAt(publishedHeight)
      expect(document.body.style.overflow).toBe('')
    })

    it.each([
      { width: 1280, height: 800, open: 768 },
      { width: 375, height: 700, open: 670 }
    ])(
      'opens with a tap to fill a $width by $height viewport, locking page scroll until Escape',
      async ({ width, height, open }) => {
        await page.viewport(width, height)
        await show()
        await settlesAt(dockedHeight)
        const docked = drawerHeight()

        await userEvent.click(page.getByRole('button', { name: 'Open cart' }))
        await settlesAt(() => open)
        expect(page.getByRole('dialog').element()).toBe(parts().drawer)
        expect(document.body.style.overflow).toBe('hidden')

        await userEvent.keyboard('{Escape}')
        await settlesAt(() => docked)
        expect(document.body.style.overflow).toBe('')
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
          await settlesAt(viewportOpen)
        }
        vi.useFakeTimers({ toFake: ['Date'] })
        drag(dy, ms)
        await settlesAt(to === 'open' ? viewportOpen : publishedHeight)
      }
    )
  })
}
