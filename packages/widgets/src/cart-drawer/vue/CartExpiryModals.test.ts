import { fireEvent, render } from '@testing-library/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import CartExpiryModals from './CartExpiryModals.vue'
import { lockBodyScroll } from './documentEffects'

afterEach(() => {
  document.body.style.overflow = ''
})

function renderModals(props: Record<string, unknown> = {}) {
  const onDismissWarning = vi.fn()
  const onNavigate = vi.fn()
  const utils = render(CartExpiryModals, {
    props: {
      showWarning: false,
      expired: false,
      remaining: null,
      onDismissWarning,
      checkoutUrl: '/outlet/extras/cart-1',
      browseHref: '/collection/?id=test',
      onNavigate,
      ...props
    }
  })
  return { ...utils, onDismissWarning, onNavigate }
}

describe('CartExpiryModals — close-to-expiry warning', () => {
  it('renders the warning with Checkout + Keep browsing + a close affordance', () => {
    const { getByRole, getByText } = renderModals({
      showWarning: true,
      remaining: 65
    })
    expect(getByText('Still here?')).toBeTruthy()
    expect(getByRole('button', { name: /checkout/i })).toBeTruthy()
    expect(getByRole('button', { name: /keep browsing/i })).toBeTruthy()
    expect(getByRole('button', { name: /close/i })).toBeTruthy()
  })

  it('dismisses via Keep browsing', async () => {
    const { getByRole, onDismissWarning } = renderModals({
      showWarning: true,
      remaining: 65
    })
    await fireEvent.click(getByRole('button', { name: /keep browsing/i }))
    expect(onDismissWarning).toHaveBeenCalledOnce()
  })

  it('navigates to checkout from the warning primary action', async () => {
    const { getByRole, onNavigate } = renderModals({
      showWarning: true,
      remaining: 65,
      checkoutUrl: '/outlet/extras/cart-1'
    })
    await fireEvent.click(getByRole('button', { name: /checkout/i }))
    expect(onNavigate).toHaveBeenCalledWith('/outlet/extras/cart-1')
  })
})

describe('CartExpiryModals — expired', () => {
  it('renders the blocking expired modal with only Browse events', () => {
    const { getByRole, getByText, queryByRole } = renderModals({
      expired: true
    })
    expect(getByText('Your hold has ended')).toBeTruthy()
    expect(getByRole('button', { name: /browse events/i })).toBeTruthy()
    // Blocking: no close button and no checkout escape.
    expect(queryByRole('button', { name: /close/i })).toBeNull()
    expect(queryByRole('button', { name: /checkout/i })).toBeNull()
  })

  it('navigates to the collection page from the expired modal', async () => {
    const { getByRole, onNavigate } = renderModals({
      expired: true,
      browseHref: '/collection/?id=test'
    })
    await fireEvent.click(getByRole('button', { name: /browse events/i }))
    expect(onNavigate).toHaveBeenCalledWith('/collection/?id=test')
  })

  it('expired wins over a simultaneous warning', () => {
    const { getByText, queryByText } = renderModals({
      showWarning: true,
      expired: true,
      remaining: 0
    })
    expect(getByText('Your hold has ended')).toBeTruthy()
    expect(queryByText('Still here?')).toBeNull()
  })
})

describe('CartExpiryModals — idle', () => {
  it('renders nothing when neither warning nor expired', () => {
    const { queryByText } = renderModals({
      showWarning: false,
      expired: false,
      remaining: 600
    })
    expect(queryByText('Still here?')).toBeNull()
    expect(queryByText('Your hold has ended')).toBeNull()
  })
})

describe('CartExpiryModals — body scroll lock composition', () => {
  it('locks background scroll while the warning is shown', async () => {
    expect(document.body.style.overflow).toBe('')
    renderModals({ showWarning: true, remaining: 65 })
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('keeps scroll locked when the warning is dismissed while the drawer still holds the lock', async () => {
    expect(document.body.style.overflow).toBe('')

    // Warning modal appears (e.g. <120s left) → it locks background scroll.
    const { rerender } = renderModals({ showWarning: true, remaining: 65 })
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')

    // The drawer is ALSO open and holding the lock, via the same refcounted
    // helper the drawer uses. This is the coexistence the inlined save/restore
    // could not survive.
    const releaseDrawer = lockBodyScroll()

    // User dismisses the warning → the warning modal unmounts.
    await rerender({ showWarning: false, expired: false, remaining: 65 })
    await nextTick()

    // The drawer is still open, so background scroll MUST stay locked.
    expect(document.body.style.overflow).toBe('hidden')

    // Once the drawer releases too, scroll is restored.
    releaseDrawer()
    expect(document.body.style.overflow).toBe('')
  })
})
