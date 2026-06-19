import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CartEvent } from '../../cart'
import { CartEventGroup } from './CartEventGroup'

const event: CartEvent = {
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

describe('CartEventGroup', () => {
  it('renders event name and venue', () => {
    render(<CartEventGroup event={event} locale='en-AU' currency='AUD' />)
    expect(screen.getByText('Night Show')).toBeInTheDocument()
    expect(screen.getByText('The Venue')).toBeInTheDocument()
  })

  it('formats ticket price with the injected currency (NZD, no hardcoded $/AUD)', () => {
    render(<CartEventGroup event={event} locale='en-NZ' currency='NZD' />)
    const priceCell = screen.getByText((text) => text.includes('25.00'))
    expect(priceCell).toBeInTheDocument()
  })

  it('shows "Free" for zero-priced tickets', () => {
    const freeEvent: CartEvent = {
      ...event,
      tickets: [{ name: 'Comp', quantity: 1, priceEach: 0 }]
    }
    render(<CartEventGroup event={freeEvent} locale='en-AU' currency='AUD' />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('renders an absolute http(s) image', () => {
    render(
      <CartEventGroup
        event={{ ...event, imageUrl: 'https://cdn.example/x.jpg' }}
        locale='en-AU'
        currency='AUD'
      />
    )
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://cdn.example/x.jpg'
    )
  })

  it('drops an unsafe (protocol-relative) image url', () => {
    render(
      <CartEventGroup
        event={{ ...event, imageUrl: '//attacker.example/pixel.gif' }}
        locale='en-AU'
        currency='AUD'
      />
    )
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renders no trash control when onRemoveEvent is omitted', () => {
    render(<CartEventGroup event={event} locale='en-AU' currency='AUD' />)
    expect(
      screen.queryByRole('button', { name: /remove night show/i })
    ).toBeNull()
  })

  it('renders a trash button named after the event when onRemoveEvent is supplied', () => {
    render(
      <CartEventGroup
        event={event}
        locale='en-AU'
        currency='AUD'
        onRemoveEvent={vi.fn()}
      />
    )
    expect(
      screen.getByRole('button', { name: 'Remove Night Show' })
    ).toBeInTheDocument()
  })

  it('opens a confirmation popover with the prompt and Cancel/Remove actions', async () => {
    render(
      <CartEventGroup
        event={event}
        locale='en-AU'
        currency='AUD'
        onRemoveEvent={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove Night Show' }))
    expect(
      await screen.findByText('Remove all tickets for this event?')
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('dialog', {
        name: 'Remove all tickets for this event?'
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('invokes onRemoveEvent with the eventId and closes when Remove is clicked', async () => {
    const onRemoveEvent = vi.fn()
    render(
      <CartEventGroup
        event={event}
        locale='en-AU'
        currency='AUD'
        onRemoveEvent={onRemoveEvent}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove Night Show' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    expect(onRemoveEvent).toHaveBeenCalledWith('e1')
    await waitFor(() =>
      expect(
        screen.queryByText('Remove all tickets for this event?')
      ).not.toBeInTheDocument()
    )
  })

  it('closes without calling onRemoveEvent when Cancel is clicked', async () => {
    const onRemoveEvent = vi.fn()
    render(
      <CartEventGroup
        event={event}
        locale='en-AU'
        currency='AUD'
        onRemoveEvent={onRemoveEvent}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove Night Show' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(onRemoveEvent).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(
        screen.queryByText('Remove all tickets for this event?')
      ).not.toBeInTheDocument()
    )
  })

  it('disables the trash trigger while a remove is in flight', () => {
    render(
      <CartEventGroup
        event={event}
        locale='en-AU'
        currency='AUD'
        onRemoveEvent={vi.fn()}
        isRemoving
      />
    )
    expect(
      screen.getByRole('button', { name: 'Remove Night Show' })
    ).toBeDisabled()
  })
})
