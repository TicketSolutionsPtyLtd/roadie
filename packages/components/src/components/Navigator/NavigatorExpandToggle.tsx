'use client'

import { use } from 'react'

import { SidebarSimpleIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import {
  NavigatorActionsContext,
  NavigatorExpansionContext
} from './NavigatorContext'
import { NavigatorTileTooltip } from './NavigatorTileTooltip'
import { presentNavIcon } from './presentNavIcon'
import {
  navigatorExpandToggleAnchorClass,
  navigatorExpandToggleClass
} from './variants'

export type NavigatorExpandToggleProps = {
  className?: string
}

/** Icon-only. Renders beside `Navigator.Brand` wherever you write it. */
export function NavigatorExpandToggle({
  className
}: NavigatorExpandToggleProps) {
  const { setExpanded, primaryId } = use(NavigatorActionsContext)
  const { expanded, expandedPending } = use(NavigatorExpansionContext)
  const label = expanded ? 'Collapse sidebar' : 'Expand sidebar'
  return (
    <div
      data-slot='navigator-expand-toggle-anchor'
      className={navigatorExpandToggleAnchorClass}
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
              className={cn(navigatorExpandToggleClass, className)}
              onClick={() => setExpanded(!expanded)}
            >
              {presentNavIcon(
                <SidebarSimpleIcon />,
                'size-5',
                'navigator-expand-toggle-icon'
              )}
              {expandedPending ? (
                // Until hydration only CSS knows the state; `display: none` drops the wrong name.
                <>
                  <span
                    data-slot='navigator-expand-toggle-label'
                    className='sr-only navigator-expanded:hidden'
                  >
                    Expand sidebar
                  </span>
                  <span
                    data-slot='navigator-expand-toggle-label'
                    className='sr-only hidden navigator-expanded:inline'
                  >
                    Collapse sidebar
                  </span>
                </>
              ) : (
                <span
                  data-slot='navigator-expand-toggle-label'
                  className='sr-only'
                >
                  {label}
                </span>
              )}
            </button>
          )
        }
      />
    </div>
  )
}

NavigatorExpandToggle.displayName = 'Navigator.ExpandToggle'
