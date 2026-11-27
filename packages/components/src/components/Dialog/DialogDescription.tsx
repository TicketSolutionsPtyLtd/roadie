'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { mergeClassName } from '../../utils/mergeClassName'

export type DialogDescriptionProps = DialogPrimitive.Description.Props &
  RefAttributes<HTMLParagraphElement>

export function DialogDescription({
  className,
  ...props
}: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      data-slot='dialog-description'
      className={mergeClassName('text-subtle', className)}
      {...props}
    />
  )
}

DialogDescription.displayName = 'Dialog.Description'
