'use client'

import { type ComponentProps, use } from 'react'

import { CircleNotchIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { statusIcon } from '../../utils/statusIcon'
import { ToastObjectContext } from './ToastContext'
import { toastIntent } from './variants'

export type ToastIconProps = ComponentProps<'span'>

function iconFor(type: string | undefined) {
  if (type === 'loading') {
    return <CircleNotchIcon weight='bold' className='size-5 animate-spin' />
  }
  return statusIcon(toastIntent(type))
}

/** The toast's intent icon, or a spinner while loading. Pass children to use your own icon. */
export function ToastIcon({ className, children, ...props }: ToastIconProps) {
  const icon = children ?? iconFor(use(ToastObjectContext)?.type)
  if (!icon) return null
  return (
    <span
      data-slot='toast-icon'
      aria-hidden='true'
      className={cn('flex shrink-0 text-subtle', className)}
      {...props}
    >
      {icon}
    </span>
  )
}

ToastIcon.displayName = 'Toast.Icon'
