import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CartUrgencyBadge } from './CartUrgencyBadge'

afterEach(() => {
  vi.useRealTimers()
})

function expiryIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

describe('CartUrgencyBadge', () => {
  it('renders danger intent when under two minutes remain', () => {
    vi.useFakeTimers()
    const { container } = render(
      <CartUrgencyBadge ticketCount={2} expiresAtUtc={expiryIn(90)} />
    )
    expect(container.querySelector('.intent-danger')).not.toBeNull()
  })

  it('renders warning intent when under five minutes remain', () => {
    vi.useFakeTimers()
    const { container } = render(
      <CartUrgencyBadge ticketCount={2} expiresAtUtc={expiryIn(200)} />
    )
    expect(container.querySelector('.intent-warning')).not.toBeNull()
  })

  it('shows the "remaining to checkout" label in long format (over five minutes)', () => {
    vi.useFakeTimers()
    const { container } = render(
      <CartUrgencyBadge
        ticketCount={2}
        expiresAtUtc={expiryIn(600)}
        progress={1}
      />
    )
    expect(container.textContent).toContain('remaining to checkout')
  })

  it('shows only the ticket count badge when no expiry is set', () => {
    const { container } = render(
      <CartUrgencyBadge ticketCount={1} expiresAtUtc={undefined} />
    )
    expect(container.querySelectorAll('[data-slot="badge"]')).toHaveLength(1)
  })

  it('renders the ticket count with a ticket icon', () => {
    const { container } = render(
      <CartUrgencyBadge ticketCount={3} expiresAtUtc={undefined} />
    )
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge?.querySelector('svg')).not.toBeNull()
    expect(badge?.textContent).toContain('3')
  })
})
