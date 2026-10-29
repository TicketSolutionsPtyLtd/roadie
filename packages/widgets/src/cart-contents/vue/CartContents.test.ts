import { fireEvent, render } from '@testing-library/vue'
import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'

import type { CartDetails, CartEvent } from '../../cart'
import CartContents from './CartContents.vue'

// @number-flow/vue is a Web Component jsdom never upgrades, so it shows no
// digits. Stub it with the text it would show, formatted with Intl as it does.
vi.mock('@number-flow/vue', () => ({
  default: {
    props: ['value', 'locales', 'format', 'prefix', 'suffix'],
    setup(props: {
      value: number
      locales?: string
      format?: Intl.NumberFormatOptions
      prefix?: string
      suffix?: string
    }) {
      return () =>
        h(
          'span',
          `${props.prefix ?? ''}${new Intl.NumberFormat(props.locales, props.format).format(props.value)}${props.suffix ?? ''}`
        )
    }
  }
}))

function makeEvent(over: Partial<CartEvent> = {}): CartEvent {
  return {
    eventId: 'e1',
    eventName: 'Show',
    venueName: 'Venue',
    eventStartAtUtc: '2026-06-15T10:00:00Z',
    eventDateKey: '2026-06-15',
    tickets: [{ name: 'GA', quantity: 1, priceEach: 25 }],
    subtotal: 25,
    bookingFees: 2,
    total: 27,
    ...over
  }
}

function makeDetails(over: Partial<CartDetails> = {}): CartDetails {
  return {
    cartId: 'c1',
    collectionName: null,
    logoUrl: null,
    cartTotal: 25,
    expiresAtUtc: new Date(Date.now() + 600000).toISOString(),
    extrasUrl: '/outlet/extras/c1',
    events: [makeEvent()],
    ...over
  }
}

describe('CartContents', () => {
  it.each([
    ['en-AU', 'AUD', /^\$1,200\.00$/],
    ['de-DE', 'EUR', /^1\.200,00 €$/],
    ['en-AU', 'JPY', /^JPY 1,200$/]
  ])(
    'reads the subtotal in %s %s as the prices read',
    (locale, currency, shown) => {
      const event = makeEvent({
        tickets: [{ name: 'GA', quantity: 1, priceEach: 1200 }],
        subtotal: 1200,
        total: 1200
      })
      const { getByText } = render(CartContents, {
        props: {
          container: 'page',
          cart: makeDetails({ cartTotal: 1200, events: [event] }),
          onNavigate: vi.fn(),
          browseHref: '/events',
          checkoutUrl: '/outlet/extras/c1',
          locale,
          currency
        }
      })

      expect(getByText('Subtotal').nextElementSibling).toHaveTextContent(shown)
    }
  )

  it('shows the empty state with browseHref when there are no tickets', async () => {
    const onNavigate = vi.fn()
    const { getByText } = render(CartContents, {
      props: {
        cart: makeDetails({ events: [], cartTotal: 0 }),
        onNavigate,
        browseHref: '/my-events',
        checkoutUrl: null,
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    await fireEvent.click(getByText('Browse events'))
    expect(onNavigate).toHaveBeenCalledWith('/my-events')
  })

  it('renders day groups in venue-local order (UTC ordering across days)', () => {
    const events = [
      makeEvent({
        eventId: 'late',
        eventDateKey: '2026-06-16',
        eventStartAtUtc: '2026-06-16T01:00:00Z'
      }),
      makeEvent({
        eventId: 'early',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T09:00:00Z'
      })
    ]
    const { container } = render(CartContents, {
      props: {
        cart: makeDetails({ events }),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    const headers = Array.from(
      container.querySelectorAll('[data-testid="cart-group-title"]')
    ).map((el) => el.textContent ?? '')
    expect(headers).toHaveLength(2)
    expect(headers[0]).toMatch(/15/)
    expect(headers[1]).toMatch(/16/)
  })

  // The day header is the other visible cart string, and it is the one that used
  // to mix an abbreviated weekday with a full month.
  it('writes the day header in one register, weekday and month both short', () => {
    const { container } = render(CartContents, {
      props: {
        cart: makeDetails({
          events: [
            makeEvent({
              eventDateKey: '2026-11-27',
              eventStartAtUtc: '2026-11-27T09:30:00Z'
            })
          ]
        }),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    const header =
      container.querySelector('[data-testid="cart-group-title"]')
        ?.textContent ?? ''
    expect(header).toBe('Fri 27 Nov 2026')
    expect(header).not.toMatch(/November|,/)
  })

  it('fires onNavigate with the checkout URL when the footer Checkout is clicked', async () => {
    const onNavigate = vi.fn()
    const { getByText } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate,
        browseHref: '/events',
        checkoutUrl: 'https://h.example/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    await fireEvent.click(getByText('Checkout'))
    expect(onNavigate).toHaveBeenCalledWith(
      'https://h.example/outlet/extras/c1'
    )
  })

  it('disables checkout when checkoutUrl is null', () => {
    const { getByText } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: null,
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    expect((getByText('Checkout') as HTMLButtonElement).disabled).toBe(true)
  })

  it('page container fills height and pins the footer', () => {
    const { container, getByText } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    const root = container.querySelector('[class*="flex-col"]') as HTMLElement
    expect(root).not.toBeNull()
    expect(root.className).toMatch(/\bflex\b/)
    expect(root.className).toMatch(/min-h-full/)
    const footer = getByText('Subtotal').closest('.border-t')
    expect(footer?.className).toMatch(/mt-auto/)
  })

  it('page container renders a Cart header', () => {
    const { getByRole } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    expect(getByRole('heading', { name: /cart/i })).toBeTruthy()
  })

  it('page container centres the empty state', () => {
    const { container, getByText } = render(CartContents, {
      props: {
        cart: makeDetails({ events: [], cartTotal: 0 }),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: null,
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    expect(container.querySelector('.place-content-center')).not.toBeNull()
    expect(getByText('Your cart is empty')).toBeTruthy()
  })

  it('transitions from the last item to the empty state (single presence tree)', async () => {
    const props = {
      onNavigate: vi.fn(),
      browseHref: '/events',
      checkoutUrl: '/outlet/extras/c1',
      locale: 'en-AU',
      currency: 'AUD',
      container: 'page' as const
    }
    const { getByText, findByText, queryByText, rerender } = render(
      CartContents,
      { props: { ...props, cart: makeDetails() } }
    )
    expect(getByText('Checkout')).toBeTruthy()
    await rerender({
      ...props,
      cart: makeDetails({ events: [], cartTotal: 0 })
    })
    expect(await findByText('Your cart is empty')).toBeTruthy()
    expect(queryByText('Checkout')).toBeNull()
  })

  it('defaults to the drawer container — no footer', () => {
    const { container, queryByText } = render(CartContents, {
      props: {
        cart: makeDetails(),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    expect(container.querySelector('.place-content-center')).toBeNull()
    expect(queryByText('Checkout')).toBeNull()
  })

  it('shows a Removing… overlay on the event being removed', () => {
    const { getAllByText } = render(CartContents, {
      props: {
        cart: makeDetails({
          events: [
            makeEvent({ eventId: 'e1', eventName: 'First' }),
            makeEvent({ eventId: 'e2', eventName: 'Second' })
          ]
        }),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: '/outlet/extras/c1',
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page',
        removingEventId: 'e1'
      }
    })
    expect(getAllByText('Removing…')).toHaveLength(1)
  })

  it('uses the larger empty state in the page container', () => {
    const { container } = render(CartContents, {
      props: {
        cart: makeDetails({ events: [], cartTotal: 0 }),
        onNavigate: vi.fn(),
        browseHref: '/events',
        checkoutUrl: null,
        locale: 'en-AU',
        currency: 'AUD',
        container: 'page'
      }
    })
    const title = container.querySelector('[data-slot="empty-state-title"]')
    expect(title?.className).toContain('text-display-ui-3')
  })
})
