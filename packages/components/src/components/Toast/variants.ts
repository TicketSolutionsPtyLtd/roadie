import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export type ToastIntent = 'neutral' | 'success' | 'danger' | 'warning' | 'info'

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

export const toastRootVariants = cva(
  [
    'absolute inset-x-0 bottom-0 origin-bottom select-none',
    'emphasis-floating rounded-xl motion-toast',
    'outline-0 outline-transparent focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-(--intent-border-strong)',
    // Bridges the gap between fanned-out toasts so the stack stays expanded.
    "after:absolute after:inset-x-0 after:top-full after:h-[calc(var(--toast-gap)+1px)] after:content-['']"
  ],
  {
    variants: {
      intent: {
        neutral: '',
        success: intentVariants.success,
        danger: intentVariants.danger,
        warning: intentVariants.warning,
        info: intentVariants.info
      }
    }
  }
)
