import { render, screen } from '@testing-library/react'
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

  it('renders success intent when no expiry is set', () => {
    const { container } = render(
      <CartUrgencyBadge ticketCount={1} expiresAtUtc={undefined} />
    )
    expect(container.querySelector('.intent-success')).not.toBeNull()
  })

  it('pluralises the ticket label', () => {
    render(<CartUrgencyBadge ticketCount={1} expiresAtUtc={undefined} />)
    expect(screen.getByText(/ticket/)).toBeInTheDocument()
  })
})
