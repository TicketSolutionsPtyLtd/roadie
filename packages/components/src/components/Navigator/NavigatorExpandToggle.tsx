'use client'

import { use } from 'react'

import { SidebarSimpleIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorContext } from './NavigatorContext'
import { NavigatorTileTooltip } from './NavigatorTileTooltip'
import { presentNavIcon } from './presentNavIcon'
import {
  navigatorExpandToggleAnchorVariants,
  navigatorExpandToggleVariants
} from './variants'

export type NavigatorExpandToggleProps = {
  className?: string
}

/** Icon-only; always renders beside `Navigator.Brand`, wherever it is written. */
export function NavigatorExpandToggle({
  className
}: NavigatorExpandToggleProps) {
  const { expanded, setExpanded, primaryId } = use(NavigatorContext)
  const label = expanded ? 'Collapse sidebar' : 'Expand sidebar'
  return (
    <div
      data-slot='navigator-expand-toggle-anchor'
      className={navigatorExpandToggleAnchorVariants()}
    >
      <NavigatorTileTooltip
        label={label}
        iconOnly
        render={(asTrigger) =>
          asTrigger(
            <button
              type='button'
              data-slot='navigator-expand-toggle'
              aria-expanded={expanded}
              aria-controls={primaryId}
              className={cn(navigatorExpandToggleVariants(), className)}
              onClick={() => setExpanded(!expanded)}
            >
              {presentNavIcon(
                <SidebarSimpleIcon />,
                'size-5',
                'navigator-expand-toggle-icon'
              )}
              <span
                data-slot='navigator-expand-toggle-label'
                className='sr-only'
              >
                {label}
              </span>
            </button>
          )
        }
      />
    </div>
  )
}

NavigatorExpandToggle.displayName = 'Navigator.ExpandToggle'
