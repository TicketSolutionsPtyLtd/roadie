'use client'

import { type ReactNode, useId } from 'react'

import { Menu } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import { IconTile } from '../IconTile'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { navigatorMenuItemClass } from './variants'

export type NavigatorMenuItemProps = {
  /** Routes through `RoadieLinkProvider`, like `Navigator.Item`. */
  href?: string
  onClick?: () => void
  /** Leading icon in a small `IconTile`. Pass `weight='bold'`. */
  icon?: ReactNode
  /** Secondary text beneath the label, e.g. an account email under a name. */
  description?: string
  className?: string
  children: ReactNode
}

export function NavigatorMenuItem({
  href,
  onClick,
  icon,
  description,
  className,
  children
}: NavigatorMenuItemProps) {
  const descriptionId = useId()
  const describedBy = description !== undefined ? descriptionId : undefined

  const content = (
    <>
      {icon ? (
        <IconTile
          data-slot='navigator-menu-item-icon'
          size='xs'
          className='shrink-0'
        >
          {icon}
        </IconTile>
      ) : null}
      <span className='grid min-w-0 flex-1 gap-0.5'>
        <span data-slot='navigator-menu-item-label' className='truncate'>
          {children}
        </span>
        {description !== undefined ? (
          // Out of the name; `aria-describedby` still reads a hidden target.
          <span
            data-slot='navigator-menu-item-description'
            id={descriptionId}
            aria-hidden='true'
            className='truncate text-sm text-subtle'
          >
            {description}
          </span>
        ) : null}
      </span>
    </>
  )
  const finalClassName = cn(navigatorMenuItemClass, className)

  if (href !== undefined) {
    return (
      // Client routing keeps the navigation mounted, so following a link must close its menu.
      <Menu.LinkItem
        data-slot='navigator-menu-item'
        className={finalClassName}
        render={<RoadieRoutedLink href={href} />}
        closeOnClick
        onClick={onClick}
        aria-describedby={describedBy}
      >
        {content}
      </Menu.LinkItem>
    )
  }

  return (
    <Menu.Item
      data-slot='navigator-menu-item'
      className={finalClassName}
      onClick={onClick}
      aria-describedby={describedBy}
    >
      {content}
    </Menu.Item>
  )
}

NavigatorMenuItem.displayName = 'Navigator.MenuItem'
