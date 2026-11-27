'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { mergeClassName } from '../../utils/mergeClassName'
import { useDialogRole } from './DialogContext'

export type DialogViewportProps = DialogPrimitive.Viewport.Props &
  RefAttributes<HTMLDivElement>

export function DialogViewport({ className, ...props }: DialogViewportProps) {
  const role = useDialogRole()
  return (
    <DialogPrimitive.Viewport
      data-slot='dialog-viewport'
      className={mergeClassName(
        [
          'fixed inset-0 grid place-items-center overflow-y-auto p-4',
          role === 'alertdialog' ? 'z-alert' : 'z-modal'
        ],
        className
      )}
      {...props}
    />
  )
}

DialogViewport.displayName = 'Dialog.Viewport'
