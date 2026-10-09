import { createCartClient, type Cart } from '@oztix/roadie-widgets/cart-drawer/core'
import {
  CartDrawer,
  CartExpiryModals,
  type CartExpiryModalsProps
} from '@oztix/roadie-widgets/cart-drawer/react'

const client = createCartClient({ baseUrl: '/api' })

export function Expiry(props: CartExpiryModalsProps & { cart: Cart }) {
  return (
    <>
      <CartDrawer client={client} />
      <CartExpiryModals {...props} />
    </>
  )
}

Expiry.displayName = CartExpiryModals.displayName
