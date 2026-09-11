'use client'

import type { ReactNode } from 'react'

import { Menu } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { navigatorMenuItemVariants } from './variants'

export type NavigatorMenuItemProps = {
  /** Routes through `RoadieLinkProvider`, like `Navigator.Item`. */
  href?: string
  onClick?: () => void
  /** Leading icon. Bold weight, like any icon outside Navigator's destinations. */
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function NavigatorMenuItem({
  href,
  onClick,
  icon,
  className,
  children
}: NavigatorMenuItemProps) {
  const content = (
    <>
      {icon ? (
        <span
          data-slot='navigator-menu-item-icon'
          className='grid size-4 place-items-center'
        >
          {icon}
        </span>
      ) : null}
      <span data-slot='navigator-menu-item-label' className='truncate'>
        {children}
      </span>
    </>
  )
  const finalClassName = cn(navigatorMenuItemVariants(), className)

  if (href !== undefined) {
    return (
      // Client routing keeps the navigation mounted, so following a link must close its menu.
      <Menu.LinkItem
        data-slot='navigator-menu-item'
        className={finalClassName}
        render={<RoadieRoutedLink href={href} />}
        closeOnClick
        onClick={onClick}
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
    >
      {content}
    </Menu.Item>
  )
}

NavigatorMenuItem.displayName = 'Navigator.MenuItem'
