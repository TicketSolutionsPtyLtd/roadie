'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { CalloutContext } from './CalloutContext'
import { statusIcon } from './statusIcon'

export type CalloutIconProps = ComponentProps<'span'>

/** The intent's status icon. Pass children to use your own. */
export function CalloutIcon({
  className,
  children,
  ...props
}: CalloutIconProps) {
  const icon = children ?? statusIcon(use(CalloutContext))
  if (!icon) return null
  return (
    <span
      data-slot='callout-icon'
      aria-hidden='true'
      className={cn(
        'col-start-1 row-span-2 row-start-1 me-3 flex h-lh items-center',
        "[&_svg:not([class*='size-'])]:size-5",
        className
      )}
      {...props}
    >
      {icon}
    </span>
  )
}

CalloutIcon.displayName = 'Callout.Icon'
