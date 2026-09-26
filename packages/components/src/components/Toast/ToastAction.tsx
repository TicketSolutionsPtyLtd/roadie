'use client'

import type { RefAttributes } from 'react'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'

import { Button } from '../Button/Button'

export type ToastActionProps = ToastPrimitive.Action.Props &
  RefAttributes<HTMLButtonElement>

/** A small Button built from the toast's `actionProps`. Renders nothing without a label. */
export function ToastAction(props: ToastActionProps) {
  return (
    <ToastPrimitive.Action
      render={
        <Button data-slot='toast-action' size='sm' className='shrink-0' />
      }
      {...props}
    />
  )
}

ToastAction.displayName = 'Toast.Action'
