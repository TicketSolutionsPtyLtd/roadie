'use client'

import { type ComponentProps, use } from 'react'

import {
  CheckCircleIcon,
  CircleNotchIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon
} from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { ToastObjectContext } from './ToastContext'
import { toastIntent } from './variants'

export type ToastIconProps = ComponentProps<'span'>

const iconClass = 'size-5'

function iconFor(type: string | undefined) {
  if (type === 'loading') {
    return (
      <CircleNotchIcon
        weight='bold'
        className={cn(iconClass, 'animate-spin')}
      />
    )
  }
  switch (toastIntent(type)) {
    case 'success':
      return <CheckCircleIcon weight='bold' className={iconClass} />
    case 'danger':
      return <WarningCircleIcon weight='bold' className={iconClass} />
    case 'warning':
      return <WarningIcon weight='bold' className={iconClass} />
    case 'info':
      return <InfoIcon weight='bold' className={iconClass} />
    default:
      return null
  }
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
