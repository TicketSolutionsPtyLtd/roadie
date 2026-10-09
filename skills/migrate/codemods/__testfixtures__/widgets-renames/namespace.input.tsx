import * as Cart from '@oztix/roadie-widgets/cart-drawer/core'
import * as Drawer from '@oztix/roadie-widgets/cart-drawer/react'

export function Expiry(props: Drawer.CartExpiryModalsProps) {
  const client = Cart.createCartClient({})
  return <Drawer.CartExpiryModals {...props} client={client} />
}

export const dialogs = Drawer.CartExpiryModals
export const parts = { ...Drawer }
