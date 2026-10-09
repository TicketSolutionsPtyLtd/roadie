import * as Cart from '@oztix/roadie-widgets/cart'
import * as Drawer from '@oztix/roadie-widgets/cart-drawer/react'

export function Expiry(props: Drawer.CartExpiryDialogsProps) {
  const client = Cart.createCartClient({})
  return <Drawer.CartExpiryDialogs {...props} client={client} />;
}

export const dialogs = Drawer.CartExpiryDialogs
export const parts = { ...Drawer }
