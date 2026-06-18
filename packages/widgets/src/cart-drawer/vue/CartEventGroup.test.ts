import { fireEvent, render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import type { CartEvent } from '../core'
import CartEventGroup from './CartEventGroup.vue'

function makeEvent(over: Partial<CartEvent> = {}): CartEvent {
  return {
    eventId: 'e1',
    eventName: 'Night Show',
    venueName: 'The Venue',
    eventStartAtUtc: '2026-06-15T10:00:00Z',
    eventDateKey: '2026-06-15',
    tickets: [{ name: 'GA', quantity: 2, priceEach: 25 }],
    subtotal: 50,
    bookingFees: 5,
    total: 55,
    ...over
  }
}

describe('CartEventGroup', () => {
  it('formats currency with the injected locale + currency (NZD, no hardcoded $ assumption)', () => {
    const { getAllByText } = render(CartEventGroup, {
      props: { event: makeEvent(), locale: 'en-NZ', currency: 'NZD' }
    })
    const totals = getAllByText(/\$50\.00/)
    expect(totals.length).toBeGreaterThan(0)
  })

  it('renders Free for zero-priced tickets', () => {
    const { getByText } = render(CartEventGroup, {
      props: {
        event: makeEvent({
          tickets: [{ name: 'Comp', quantity: 1, priceEach: 0 }]
        }),
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    expect(getByText('Free')).toBeTruthy()
  })

  it('renders the event + venue names', () => {
    const { getByText } = render(CartEventGroup, {
      props: { event: makeEvent(), locale: 'en-AU', currency: 'AUD' }
    })
    expect(getByText('Night Show')).toBeTruthy()
    expect(getByText('The Venue')).toBeTruthy()
  })

  it('renders an absolute http(s) image', () => {
    const { container } = render(CartEventGroup, {
      props: {
        event: makeEvent({ imageUrl: 'https://cdn.example/x.jpg' }),
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example/x.jpg'
    )
  })

  it('drops an unsafe (protocol-relative) image url', () => {
    const { container } = render(CartEventGroup, {
      props: {
        event: makeEvent({ imageUrl: '//attacker.example/pixel.gif' }),
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders a remove trash button with the event-name aria-label', () => {
    const { getByLabelText } = render(CartEventGroup, {
      props: { event: makeEvent(), locale: 'en-AU', currency: 'AUD' }
    })
    expect(getByLabelText('Remove Night Show')).toBeTruthy()
  })

  it('opens the confirm popover with the prompt + Cancel/Remove on trash click', async () => {
    const { getByLabelText, getByText, queryByText } = render(CartEventGroup, {
      props: { event: makeEvent(), locale: 'en-AU', currency: 'AUD' }
    })
    expect(queryByText('Remove all tickets for this event?')).toBeNull()

    await fireEvent.click(getByLabelText('Remove Night Show'))

    expect(getByText('Remove all tickets for this event?')).toBeTruthy()
    expect(getByText('Cancel')).toBeTruthy()
    expect(getByText('Remove')).toBeTruthy()
  })

  it('emits removeEvent with the eventId when Remove is confirmed', async () => {
    const { getByLabelText, getByText, emitted } = render(CartEventGroup, {
      props: {
        event: makeEvent({ eventId: 'evt-42' }),
        locale: 'en-AU',
        currency: 'AUD'
      }
    })
    await fireEvent.click(getByLabelText('Remove Night Show'))
    await fireEvent.click(getByText('Remove'))

    expect(emitted().removeEvent).toBeTruthy()
    expect(emitted().removeEvent![0]).toEqual(['evt-42'])
  })

  it('Cancel closes the popover without emitting', async () => {
    const { getByLabelText, getByText, queryByText, emitted } = render(
      CartEventGroup,
      { props: { event: makeEvent(), locale: 'en-AU', currency: 'AUD' } }
    )
    await fireEvent.click(getByLabelText('Remove Night Show'))
    await fireEvent.click(getByText('Cancel'))

    expect(queryByText('Remove all tickets for this event?')).toBeNull()
    expect(emitted().removeEvent).toBeFalsy()
  })

  it('dismisses the popover on an outside pointerdown', async () => {
    const { getByLabelText, queryByText } = render(CartEventGroup, {
      props: { event: makeEvent(), locale: 'en-AU', currency: 'AUD' }
    })
    await fireEvent.click(getByLabelText('Remove Night Show'))
    expect(queryByText('Remove all tickets for this event?')).toBeTruthy()

    await fireEvent.pointerDown(document.body)
    expect(queryByText('Remove all tickets for this event?')).toBeNull()
  })

  it('disables the trash + Remove while busy', async () => {
    const { getByLabelText } = render(CartEventGroup, {
      props: {
        event: makeEvent(),
        locale: 'en-AU',
        currency: 'AUD',
        busy: true
      }
    })
    const trash = getByLabelText('Remove Night Show') as HTMLButtonElement
    expect(trash.disabled).toBe(true)
    await fireEvent.click(trash)
    expect(trash.getAttribute('aria-expanded')).toBe('false')
  })
})
