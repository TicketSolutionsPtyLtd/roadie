import { CartExpiryModals } from '@oztix/roadie-widgets/cart-drawer/react'

export function Slot({ CartExpiryModals }: { CartExpiryModals: () => null }) {
  return <CartExpiryModals />
}

export function count() {
  const CartExpiryModals = 2
  return CartExpiryModals + 1
}

export const expiry = <CartExpiryModals />
