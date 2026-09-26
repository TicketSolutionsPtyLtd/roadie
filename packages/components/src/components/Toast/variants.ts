import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export type ToastIntent = 'neutral' | 'success' | 'danger' | 'warning' | 'info'

export type ToastPosition =
  'bottom-end' | 'bottom-center' | 'top-end' | 'top-center'

export type ToastSide = 'top' | 'bottom'

const INTENTS: readonly string[] = [
  'neutral',
  'success',
  'danger',
  'warning',
  'info'
] satisfies ToastIntent[]

// A settled promise toast carries Base UI's `error` type.
export function toastIntent(type: string | undefined): ToastIntent | undefined {
  if (type === 'error') return 'danger'
  return type && INTENTS.includes(type) ? (type as ToastIntent) : undefined
}

export function toastSide(position: ToastPosition): ToastSide {
  return position.startsWith('top') ? 'top' : 'bottom'
}

export const toastViewportVariants = cva(
  'fixed inset-x-4 z-toast outline-none sm:w-sm',
  {
    variants: {
      side: {
        bottom:
          'bottom-[calc(max(--spacing(4),env(safe-area-inset-bottom))+var(--toast-viewport-offset-bottom,0px))] sm:bottom-[calc(max(--spacing(6),env(safe-area-inset-bottom))+var(--toast-viewport-offset-bottom,0px))]',
        top: 'top-[calc(max(--spacing(4),env(safe-area-inset-top))+var(--toast-viewport-offset-top,0px))] sm:top-[calc(max(--spacing(6),env(safe-area-inset-top))+var(--toast-viewport-offset-top,0px))]'
      },
      align: {
        end: 'sm:start-auto sm:end-6',
        center: 'sm:inset-x-0 sm:mx-auto'
      }
    }
  }
)

export const toastRootVariants = cva(
  [
    'absolute inset-x-0 select-none',
    'emphasis-floating rounded-xl motion-toast',
    'outline-0 outline-transparent focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-(--intent-border-strong)',
    // Bridges the gap between fanned-out toasts so the stack stays expanded.
    "after:absolute after:inset-x-0 after:h-[calc(var(--toast-gap)+1px)] after:content-['']"
  ],
  {
    variants: {
      side: {
        bottom: 'bottom-0 origin-bottom after:top-full',
        top: 'top-0 origin-top after:bottom-full'
      },
      intent: {
        neutral: '',
        success: intentVariants.success,
        danger: intentVariants.danger,
        warning: intentVariants.warning,
        info: intentVariants.info
      }
    },
    defaultVariants: { side: 'bottom' }
  }
)
