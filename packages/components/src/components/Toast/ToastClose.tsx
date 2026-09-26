'use client'

import type { RefAttributes } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { XIcon } from '@phosphor-icons/react/ssr'

import { IconButton } from '../Button/IconButton'

export type ToastCloseProps = ToastPrimitive.Close.Props &
  RefAttributes<HTMLButtonElement> & {
    /** @default 'Dismiss' */
    'aria-label'?: string
  }

/** An icon button that dismisses the toast. */
export function ToastClose({
  'aria-label': ariaLabel = 'Dismiss',
  children,
  ...props
}: ToastCloseProps) {
  return (
    <ToastPrimitive.Close
      aria-label={ariaLabel}
      render={
        <IconButton
          data-slot='toast-close'
          aria-label={ariaLabel}
          size='sm'
          emphasis='subtler'
          className='shrink-0'
        />
      }
      {...props}
    >
      {children ?? <XIcon weight='bold' className='size-4' />}
    </ToastPrimitive.Close>
  )
}

ToastClose.displayName = 'Toast.Close'
