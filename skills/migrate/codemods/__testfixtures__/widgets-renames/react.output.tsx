import { createCartClient, type Cart } from '@oztix/roadie-widgets/cart'
import {
  CartDrawer,
  CartExpiryDialogs,
  type CartExpiryDialogsProps
} from '@oztix/roadie-widgets/cart-drawer/react'

const client = createCartClient({ baseUrl: '/api' })

export function Expiry(props: CartExpiryDialogsProps & { cart: Cart }) {
  return (
    <>
      <CartDrawer client={client} />
      <CartExpiryDialogs {...props} />
    </>
  );
}

Expiry.displayName = CartExpiryDialogs.displayName
