'use client'

import type { RefAttributes } from 'react'

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

export type DialogTriggerProps = DialogPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function DialogTrigger({ className, ...props }: DialogTriggerProps) {
  return (
    <DialogPrimitive.Trigger
      data-slot='dialog-trigger'
      className={className}
      {...props}
    />
  )
}

DialogTrigger.displayName = 'Dialog.Trigger'
