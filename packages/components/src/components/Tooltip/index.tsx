// NO 'use client' — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { TooltipArrow } from './TooltipArrow'
import { TooltipContent } from './TooltipContent'
import { TooltipPopup } from './TooltipPopup'
import { TooltipPortal } from './TooltipPortal'
import { TooltipPositioner } from './TooltipPositioner'
import { TooltipProvider } from './TooltipProvider'
import { TooltipRoot } from './TooltipRoot'
import { TooltipTrigger } from './TooltipTrigger'

const Tooltip = TooltipRoot as typeof TooltipRoot & {
  Root: typeof TooltipRoot
  Provider: typeof TooltipProvider
  Trigger: typeof TooltipTrigger
  Portal: typeof TooltipPortal
  Positioner: typeof TooltipPositioner
  Popup: typeof TooltipPopup
  Arrow: typeof TooltipArrow
  Content: typeof TooltipContent
}

Tooltip.Root = TooltipRoot
Tooltip.Provider = TooltipProvider
Tooltip.Trigger = TooltipTrigger
Tooltip.Portal = TooltipPortal
Tooltip.Positioner = TooltipPositioner
Tooltip.Popup = TooltipPopup
Tooltip.Arrow = TooltipArrow
Tooltip.Content = TooltipContent

export { Tooltip }
export type { TooltipRootProps as TooltipProps } from './TooltipRoot'
export type { TooltipProviderProps } from './TooltipProvider'
export type { TooltipTriggerProps } from './TooltipTrigger'
export type { TooltipPortalProps } from './TooltipPortal'
export type { TooltipPositionerProps } from './TooltipPositioner'
export type { TooltipPopupProps } from './TooltipPopup'
export type { TooltipArrowProps } from './TooltipArrow'
export type { TooltipContentProps } from './TooltipContent'
export {
  tooltipPopupVariants,
  type TooltipEmphasis,
  type TooltipSide
} from './variants'
