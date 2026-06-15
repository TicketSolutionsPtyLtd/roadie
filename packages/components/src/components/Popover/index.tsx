// NO 'use client' — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { PopoverArrow } from './PopoverArrow'
import { PopoverBody } from './PopoverBody'
import { PopoverClose } from './PopoverClose'
import { PopoverContent } from './PopoverContent'
import { PopoverDescription } from './PopoverDescription'
import { PopoverFooter } from './PopoverFooter'
import { PopoverHeader } from './PopoverHeader'
import { PopoverPopup } from './PopoverPopup'
import { PopoverPortal } from './PopoverPortal'
import { PopoverPositioner } from './PopoverPositioner'
import { PopoverRoot } from './PopoverRoot'
import { PopoverTitle } from './PopoverTitle'
import { PopoverTrigger } from './PopoverTrigger'

const Popover = PopoverRoot as typeof PopoverRoot & {
  Root: typeof PopoverRoot
  Trigger: typeof PopoverTrigger
  Portal: typeof PopoverPortal
  Positioner: typeof PopoverPositioner
  Popup: typeof PopoverPopup
  Arrow: typeof PopoverArrow
  Title: typeof PopoverTitle
  Description: typeof PopoverDescription
  Close: typeof PopoverClose
  Header: typeof PopoverHeader
  Body: typeof PopoverBody
  Footer: typeof PopoverFooter
  Content: typeof PopoverContent
}

Popover.Root = PopoverRoot
Popover.Trigger = PopoverTrigger
Popover.Portal = PopoverPortal
Popover.Positioner = PopoverPositioner
Popover.Popup = PopoverPopup
Popover.Arrow = PopoverArrow
Popover.Title = PopoverTitle
Popover.Description = PopoverDescription
Popover.Close = PopoverClose
Popover.Header = PopoverHeader
Popover.Body = PopoverBody
Popover.Footer = PopoverFooter
Popover.Content = PopoverContent

export { Popover }
export type { PopoverRootProps as PopoverProps } from './PopoverRoot'
export type { PopoverTriggerProps } from './PopoverTrigger'
export type { PopoverPortalProps } from './PopoverPortal'
export type { PopoverPositionerProps } from './PopoverPositioner'
export type { PopoverPopupProps } from './PopoverPopup'
export type { PopoverArrowProps } from './PopoverArrow'
export type { PopoverTitleProps } from './PopoverTitle'
export type { PopoverDescriptionProps } from './PopoverDescription'
export type { PopoverCloseProps } from './PopoverClose'
export type { PopoverHeaderProps } from './PopoverHeader'
export type { PopoverBodyProps } from './PopoverBody'
export type { PopoverFooterProps } from './PopoverFooter'
export type { PopoverContentProps } from './PopoverContent'
export { popoverPopupVariants } from './variants'
