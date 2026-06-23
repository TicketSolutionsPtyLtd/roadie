import { render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import CartUrgencyBadge from './CartUrgencyBadge.vue'

describe('CartUrgencyBadge', () => {
  it('paints danger when under 2 minutes remain', () => {
    const { container } = render(CartUrgencyBadge, {
      props: {
        ticketCount: 2,
        expiresAtUtc: new Date(Date.now() + 90 * 1000).toISOString()
      }
    })
    expect(container.querySelector('[data-intent="danger"]')).not.toBeNull()
  })

  it('paints warning between 2 and 5 minutes', () => {
    const { container } = render(CartUrgencyBadge, {
      props: {
        ticketCount: 2,
        expiresAtUtc: new Date(Date.now() + 4 * 60 * 1000).toISOString()
      }
    })
    expect(container.querySelector('[data-intent="warning"]')).not.toBeNull()
  })

  it('shows only the count badge (icon + number) when no expiry is set', () => {
    const { container } = render(CartUrgencyBadge, {
      props: { ticketCount: 3, expiresAtUtc: undefined }
    })
    const count = container.querySelector('[data-testid="cart-badge-count"]')
    expect(count).not.toBeNull()
    expect(count?.querySelector('svg')).not.toBeNull()
    expect(
      container.querySelector('[data-testid="cart-badge-time"]')
    ).toBeNull()
  })

  it('shows the "remaining to checkout" label in long format (over five minutes)', () => {
    const { container } = render(CartUrgencyBadge, {
      props: {
        ticketCount: 2,
        expiresAtUtc: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        progress: 1
      }
    })
    expect(container.textContent).toContain('remaining to checkout')
  })

  it('reveals the "tickets" label when progress is 1', () => {
    const { container } = render(CartUrgencyBadge, {
      props: { ticketCount: 3, expiresAtUtc: undefined, progress: 1 }
    })
    const count = container.querySelector('[data-testid="cart-badge-count"]')
    expect(count?.textContent).toContain('tickets')
  })

  it('uses the singular "ticket" label for a single ticket', () => {
    const { container } = render(CartUrgencyBadge, {
      props: { ticketCount: 1, expiresAtUtc: undefined, progress: 1 }
    })
    const count = container.querySelector('[data-testid="cart-badge-count"]')
    expect(count?.textContent).toContain('ticket')
    expect(count?.textContent).not.toContain('tickets')
  })

  it('renders a countdown when time remains', () => {
    const { container } = render(CartUrgencyBadge, {
      props: {
        ticketCount: 2,
        expiresAtUtc: new Date(Date.now() + 90 * 1000).toISOString()
      }
    })
    const time = container.querySelector('[data-testid="cart-badge-time"]')
    expect(time).not.toBeNull()
    // jsdom doesn't render <number-flow-vue> digit content, so assert presence.
    expect(time?.querySelector('number-flow-vue')).not.toBeNull()
  })
})
