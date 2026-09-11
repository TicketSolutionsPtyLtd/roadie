'use client'

import {
  Children,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  NavigatorGroupTitle,
  type NavigatorGroupTitleProps
} from './NavigatorGroupTitle'
import type {
  NavigatorPlacement,
  NavigatorVisibilityPriority
} from './mobileSlots'
import { navigatorGroupListVariants } from './variants'

export type NavigatorGroupProps = {
  /** `Navigator.GroupTitle` followed by the group's `Navigator.Item`s. */
  children?: ReactNode
  className?: string
  /** Every item in the group follows it. @default 'automatic' */
  placement?: NavigatorPlacement
  /** Which items stay visible when space runs out; an item's own wins. @default 'automatic' */
  visibilityPriority?: NavigatorVisibilityPriority
}

/**
 * A headed run of `Navigator.Item`s, in the primary navigation or inside a
 * `Navigator.Secondary`. Author inside a client component: the title is found
 * by element reference. See COMPOUND_PATTERNS.md §1.2.
 */
export function NavigatorGroup({ children, className }: NavigatorGroupProps) {
  const titleId = useId()
  let title: ReactNode = null
  const rows: ReactNode[] = []

  Children.forEach(children, (child) => {
    if (
      isValidElement<NavigatorGroupTitleProps>(child) &&
      child.type === NavigatorGroupTitle
    ) {
      title = cloneElement(child, { id: titleId })
      return
    }
    rows.push(child)
  })

  return (
    <>
      {title}
      <ul
        data-slot='navigator-group-list'
        aria-labelledby={title !== null ? titleId : undefined}
        className={cn(navigatorGroupListVariants(), className)}
      >
        {rows.map((row, index) => (
          <li key={index}>{row}</li>
        ))}
      </ul>
    </>
  )
}

NavigatorGroup.displayName = 'Navigator.Group'
