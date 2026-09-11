'use client'

import { use } from 'react'

import { SidebarSimpleIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorContext } from './NavigatorContext'
import type { NavigatorPlacement } from './mobileSlots'
import { presentNavIcon } from './presentNavIcon'
import { navigatorItemLabelClass, navigatorItemVariants } from './variants'

export type NavigatorExpandToggleProps = {
  /** Placed like an item; never folds into More. @default 'automatic' */
  placement?: NavigatorPlacement
  className?: string
}

export function NavigatorExpandToggle({
  className
}: NavigatorExpandToggleProps) {
  const { expanded, setExpanded, primaryId } = use(NavigatorContext)
  const label = expanded ? 'Collapse sidebar' : 'Expand sidebar'
  return (
    <button
      type='button'
      data-slot='navigator-expand-toggle'
      aria-expanded={expanded}
      aria-controls={primaryId}
      className={cn(navigatorItemVariants({ active: false }), className)}
      onClick={() => setExpanded(!expanded)}
    >
      <span data-slot='navigator-item-icon'>
        {presentNavIcon(<SidebarSimpleIcon />, false, 'size-6')}
      </span>
      <span
        data-slot='navigator-item-label'
        className={navigatorItemLabelClass}
      >
        {label}
      </span>
    </button>
  )
}

NavigatorExpandToggle.displayName = 'Navigator.ExpandToggle'
