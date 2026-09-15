import type { ComponentProps, ReactElement } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  navigatorGroupTitleClass,
  navigatorGroupTitleTextClass
} from './variants'

export type NavigatorGroupTitleProps = ComponentProps<'h2'> & {
  /** Replace the h2 when the outline needs another level. */
  render?: (props: ComponentProps<'h2'>) => ReactElement
}

/** Heading for a `Navigator.Group`. Declare it as the group's first child. */
export function NavigatorGroupTitle({
  className,
  render,
  children,
  ...props
}: NavigatorGroupTitleProps) {
  const resolved = {
    'data-slot': 'navigator-group-title',
    className: cn(navigatorGroupTitleClass, className),
    ...props,
    children: (
      <span
        data-slot='navigator-group-title-text'
        className={navigatorGroupTitleTextClass}
      >
        {children}
      </span>
    )
  }
  return render ? render(resolved) : <h2 {...resolved} />
}

NavigatorGroupTitle.displayName = 'Navigator.GroupTitle'
