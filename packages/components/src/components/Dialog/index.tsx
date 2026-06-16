// NO 'use client' — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { DialogBackdrop } from './DialogBackdrop'
import { DialogBody } from './DialogBody'
import { DialogClose } from './DialogClose'
import { DialogContent } from './DialogContent'
import { DialogDescription } from './DialogDescription'
import { DialogFooter } from './DialogFooter'
import { DialogHeader } from './DialogHeader'
import { DialogPopup } from './DialogPopup'
import { DialogPortal } from './DialogPortal'
import { DialogRoot } from './DialogRoot'
import { DialogTitle } from './DialogTitle'
import { DialogTrigger } from './DialogTrigger'
import { DialogViewport } from './DialogViewport'

const Dialog = DialogRoot as typeof DialogRoot & {
  Root: typeof DialogRoot
  Trigger: typeof DialogTrigger
  Portal: typeof DialogPortal
  Backdrop: typeof DialogBackdrop
  Viewport: typeof DialogViewport
  Popup: typeof DialogPopup
  Title: typeof DialogTitle
  Description: typeof DialogDescription
  Close: typeof DialogClose
  Header: typeof DialogHeader
  Body: typeof DialogBody
  Footer: typeof DialogFooter
  Content: typeof DialogContent
}

Dialog.Root = DialogRoot
Dialog.Trigger = DialogTrigger
Dialog.Portal = DialogPortal
Dialog.Backdrop = DialogBackdrop
Dialog.Viewport = DialogViewport
Dialog.Popup = DialogPopup
Dialog.Title = DialogTitle
Dialog.Description = DialogDescription
Dialog.Close = DialogClose
Dialog.Header = DialogHeader
Dialog.Body = DialogBody
Dialog.Footer = DialogFooter
Dialog.Content = DialogContent

export { Dialog }
export type { DialogRootProps as DialogProps } from './DialogRoot'
export type { DialogTriggerProps } from './DialogTrigger'
export type { DialogPortalProps } from './DialogPortal'
export type { DialogBackdropProps } from './DialogBackdrop'
export type { DialogViewportProps } from './DialogViewport'
export type { DialogPopupProps } from './DialogPopup'
export type { DialogTitleProps } from './DialogTitle'
export type { DialogDescriptionProps } from './DialogDescription'
export type { DialogCloseProps } from './DialogClose'
export type { DialogHeaderProps } from './DialogHeader'
export type { DialogBodyProps } from './DialogBody'
export type { DialogFooterProps } from './DialogFooter'
export type { DialogContentProps } from './DialogContent'
export { dialogPopupVariants } from './variants'
