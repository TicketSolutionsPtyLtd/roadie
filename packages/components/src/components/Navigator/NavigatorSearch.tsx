'use client'

import type { ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useRegisteredPalette } from '../CommandPalette/registry'
import { ariaKeyShortcuts } from '../CommandPalette/shortcut'
import { KbdShortcut } from '../Kbd/KbdShortcut'
import { useKeyPlatform } from '../Kbd/platform'
import { NavigatorDestination } from './NavigatorDestination'
import { NavigatorTileTooltip } from './NavigatorTileTooltip'
import type { NavigatorPlacement } from './mobileSlots'
import { presentNavIcon } from './presentNavIcon'
import { searchSlotMeta } from './searchSlot'
import { navigatorItemLabelClass, navigatorItemVariants } from './variants'

export type NavigatorSearchProps = {
  /** `pinned` puts it under `Navigator.Brand` in the vertical navigation and in the phone bar's circle, ahead of other pinned items. `automatic` ranks it like any `Navigator.Item`. @default 'pinned' */
  placement?: NavigatorPlacement
  /** @default 'Search' */
  label?: ReactNode
  /** A bare Phosphor icon. @default MagnifyingGlassIcon */
  icon?: ReactNode
  className?: string
}

/**
 * Opens the page's CommandPalette, the one that binds a shortcut. With none,
 * it renders nothing.
 */
export function NavigatorSearch({
  placement,
  label: labelProp,
  icon: iconProp,
  className
}: NavigatorSearchProps) {
  const palette = useRegisteredPalette()
  const platform = useKeyPlatform()
  const { label, icon } = searchSlotMeta({
    placement,
    label: labelProp,
    icon: iconProp
  })
  return (
    <NavigatorTileTooltip
      label={
        <span className='flex items-center gap-2'>
          {label}
          {palette ? (
            <KbdShortcut shortcut={palette.shortcut} size='sm' />
          ) : null}
        </span>
      }
      render={(asTrigger) =>
        asTrigger(
          <NavigatorDestination
            aria-keyshortcuts={
              palette ? ariaKeyShortcuts(palette.shortcut, platform) : undefined
            }
            className={cn(navigatorItemVariants({ active: false }), className)}
            onClick={() => palette?.open()}
          >
            <span data-slot='navigator-item-icon'>
              {presentNavIcon(icon, 'size-6')}
            </span>
            <span
              data-slot='navigator-item-label'
              className={navigatorItemLabelClass}
            >
              {label}
            </span>
          </NavigatorDestination>
        )
      }
    />
  )
}

NavigatorSearch.displayName = 'Navigator.Search'
