// No `'use client'`: server-safe property-assignment layer.
import { DrawerBackdrop } from './DrawerBackdrop'
import { DrawerBody } from './DrawerBody'
import { DrawerClose } from './DrawerClose'
import { DrawerContent } from './DrawerContent'
import { DrawerDescription } from './DrawerDescription'
import { DrawerFooter } from './DrawerFooter'
import { DrawerHandle } from './DrawerHandle'
import { DrawerHeader } from './DrawerHeader'
import { DrawerPopup } from './DrawerPopup'
import { DrawerPortal } from './DrawerPortal'
import { DrawerRoot } from './DrawerRoot'
import { DrawerSwipeArea } from './DrawerSwipeArea'
import { DrawerTitle } from './DrawerTitle'
import { DrawerTrigger } from './DrawerTrigger'
import { DrawerViewport } from './DrawerViewport'

const Drawer = DrawerRoot as typeof DrawerRoot & {
  Root: typeof DrawerRoot
  Trigger: typeof DrawerTrigger
  Portal: typeof DrawerPortal
  Backdrop: typeof DrawerBackdrop
  Viewport: typeof DrawerViewport
  Popup: typeof DrawerPopup
  SwipeArea: typeof DrawerSwipeArea
  Handle: typeof DrawerHandle
  Title: typeof DrawerTitle
  Description: typeof DrawerDescription
  Close: typeof DrawerClose
  Header: typeof DrawerHeader
  Body: typeof DrawerBody
  Footer: typeof DrawerFooter
  Content: typeof DrawerContent
}

Drawer.Root = DrawerRoot
Drawer.Trigger = DrawerTrigger
Drawer.Portal = DrawerPortal
Drawer.Backdrop = DrawerBackdrop
Drawer.Viewport = DrawerViewport
Drawer.Popup = DrawerPopup
Drawer.SwipeArea = DrawerSwipeArea
Drawer.Handle = DrawerHandle
Drawer.Title = DrawerTitle
Drawer.Description = DrawerDescription
Drawer.Close = DrawerClose
Drawer.Header = DrawerHeader
Drawer.Body = DrawerBody
Drawer.Footer = DrawerFooter
Drawer.Content = DrawerContent

export { Drawer }
export type { DrawerRootProps as DrawerProps } from './DrawerRoot'
export type { DrawerTriggerProps } from './DrawerTrigger'
export type { DrawerPortalProps } from './DrawerPortal'
export type { DrawerBackdropProps } from './DrawerBackdrop'
export type { DrawerViewportProps } from './DrawerViewport'
export type { DrawerPopupProps } from './DrawerPopup'
export type { DrawerSwipeAreaProps } from './DrawerSwipeArea'
export type { DrawerHandleProps } from './DrawerHandle'
export type { DrawerTitleProps } from './DrawerTitle'
export type { DrawerDescriptionProps } from './DrawerDescription'
export type { DrawerCloseProps } from './DrawerClose'
export type { DrawerHeaderProps } from './DrawerHeader'
export type { DrawerBodyProps } from './DrawerBody'
export type { DrawerFooterProps } from './DrawerFooter'
export type { DrawerContentProps } from './DrawerContent'
export {
  drawerPopupVariants,
  drawerViewportVariants,
  type DrawerSide,
  type DrawerSize
} from './variants'
