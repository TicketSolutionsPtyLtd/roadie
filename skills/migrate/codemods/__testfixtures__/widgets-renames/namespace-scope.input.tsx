import type * as Drawer from '@oztix/roadie-widgets/cart-drawer/react'
import { CartExpiryModals } from '@oztix/roadie-widgets/cart-drawer/react'

export { CartExpiryModals } from '@oztix/roadie-widgets/cart-drawer/vue'
export * from '@oztix/roadie-widgets/cart-drawer/react'
export type Props = Drawer.CartExpiryModalsProps

export function read(Drawer: { CartExpiryModals: number }) {
  return Drawer.CartExpiryModals
}

export const expiry = <CartExpiryModals />
