import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CartExpiryDialogs } from './CartExpiryDialogs'

type Props = Parameters<typeof CartExpiryDialogs>[0]

function renderModals(overrides: Partial<Props> = {}) {
  const onDismissWarning = vi.fn()
  const onNavigate = vi.fn()
  render(
    <CartExpiryDialogs
      showWarning={false}
      expired={false}
      remaining={null}
      onDismissWarning={onDismissWarning}
      checkoutUrl='/outlet/extras/cart-1'
      browseHref='/collection/?id=test'
      onNavigate={onNavigate}
      {...overrides}
    />
  )
  return { onDismissWarning, onNavigate }
}

describe('CartExpiryDialogs — close-to-expiry warning', () => {
  it('renders the warning with Checkout + Keep browsing + a close affordance', () => {
    renderModals({ showWarning: true, remaining: 65 })
    expect(screen.getByText(/still here\?/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /checkout/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /keep browsing/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('dismisses via Keep browsing', () => {
    const { onDismissWarning } = renderModals({
      showWarning: true,
      remaining: 65
    })
    fireEvent.click(screen.getByRole('button', { name: /keep browsing/i }))
    expect(onDismissWarning).toHaveBeenCalledOnce()
  })

  it('navigates to checkout from the warning primary action', () => {
    const { onNavigate } = renderModals({
      showWarning: true,
      remaining: 65,
      checkoutUrl: '/outlet/extras/cart-1'
    })
    fireEvent.click(screen.getByRole('button', { name: /checkout/i }))
    expect(onNavigate).toHaveBeenCalledWith('/outlet/extras/cart-1')
  })
})

describe('CartExpiryDialogs — expired', () => {
  it('renders the blocking expired modal with only Browse events', () => {
    renderModals({ expired: true })
    expect(screen.getByText(/your hold has ended/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /browse events/i })
    ).toBeInTheDocument()
    // Blocking: no close button and no checkout escape.
    expect(
      screen.queryByRole('button', { name: /close/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /checkout/i })
    ).not.toBeInTheDocument()
  })

  it('navigates to the collection page from the expired modal', () => {
    const { onNavigate } = renderModals({
      expired: true,
      browseHref: '/collection/?id=test'
    })
    fireEvent.click(screen.getByRole('button', { name: /browse events/i }))
    expect(onNavigate).toHaveBeenCalledWith('/collection/?id=test')
  })

  it('expired wins over a simultaneous warning', () => {
    renderModals({ showWarning: true, expired: true, remaining: 0 })
    expect(screen.getByText(/your hold has ended/i)).toBeInTheDocument()
    expect(screen.queryByText(/still here\?/i)).not.toBeInTheDocument()
  })
})

describe('CartExpiryDialogs — idle', () => {
  it('renders nothing when neither warning nor expired', () => {
    renderModals({ showWarning: false, expired: false, remaining: 600 })
    expect(screen.queryByText(/still here\?/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/your hold has ended/i)).not.toBeInTheDocument()
  })
})
