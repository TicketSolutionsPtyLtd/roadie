import type * as Drawer from '@oztix/roadie-widgets/cart-drawer/react'
import { CartExpiryDialogs } from '@oztix/roadie-widgets/cart-drawer/react'

export { CartExpiryModals } from '@oztix/roadie-widgets/cart-drawer/vue'
export * from '@oztix/roadie-widgets/cart-drawer/react'
export type Props = Drawer.CartExpiryDialogsProps

export function read(Drawer: { CartExpiryModals: number }) {
  return Drawer.CartExpiryModals
}

export const expiry = <CartExpiryDialogs />
