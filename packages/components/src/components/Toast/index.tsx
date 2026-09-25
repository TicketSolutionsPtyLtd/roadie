// No 'use client': dot access must work from server components.
import { ToastAction } from './ToastAction'
import { ToastClose } from './ToastClose'
import { ToastContent } from './ToastContent'
import { ToastDescription } from './ToastDescription'
import { ToastIcon } from './ToastIcon'
import { ToastProvider } from './ToastProvider'
import { ToastRoot } from './ToastRoot'
import { ToastTitle } from './ToastTitle'
import { ToastViewport } from './ToastViewport'

const Toast = ToastRoot as typeof ToastRoot & {
  Root: typeof ToastRoot
  Provider: typeof ToastProvider
  Viewport: typeof ToastViewport
  Content: typeof ToastContent
  Icon: typeof ToastIcon
  Title: typeof ToastTitle
  Description: typeof ToastDescription
  Action: typeof ToastAction
  Close: typeof ToastClose
}

Toast.Root = ToastRoot
Toast.Provider = ToastProvider
Toast.Viewport = ToastViewport
Toast.Content = ToastContent
Toast.Icon = ToastIcon
Toast.Title = ToastTitle
Toast.Description = ToastDescription
Toast.Action = ToastAction
Toast.Close = ToastClose

export { Toast }
export { useToastManager } from './useToastManager'
export { createToastManager } from './createToastManager'
export type { UseToastManagerReturnValue } from './useToastManager'
export type { ToastManager } from './createToastManager'
export type { ToastAddOptions, ToastUpdateOptions } from './manager'
export type { ToastRootProps as ToastProps } from './ToastRoot'
export type { ToastProviderProps } from './ToastProvider'
export type { ToastViewportProps } from './ToastViewport'
export type { ToastContentProps } from './ToastContent'
export type { ToastIconProps } from './ToastIcon'
export type { ToastTitleProps } from './ToastTitle'
export type { ToastDescriptionProps } from './ToastDescription'
export type { ToastActionProps } from './ToastAction'
export type { ToastCloseProps } from './ToastClose'
export {
  toastRootVariants,
  toastViewportVariants,
  type ToastIntent,
  type ToastPosition
} from './variants'
