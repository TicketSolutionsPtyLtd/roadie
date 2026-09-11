'use client'

import {
  Children,
  type ReactNode,
  cloneElement,
  isValidElement,
  use,
  useId
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorFoldedContext } from './NavigatorFoldedContext'
import {
  NavigatorGroupTitle,
  type NavigatorGroupTitleProps
} from './NavigatorGroupTitle'
import type {
  NavigatorPlacement,
  NavigatorVisibilityPriority
} from './mobileSlots'
import { navigatorCapsuleVariants } from './variants'

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
  const folded = use(NavigatorFoldedContext)
  let title: ReactNode = null
  const rows: { key: string | number; row: ReactNode }[] = []

  Children.forEach(children, (child) => {
    if (
      isValidElement<NavigatorGroupTitleProps>(child) &&
      child.type === NavigatorGroupTitle
    ) {
      title = cloneElement(child, { id: titleId })
      return
    }
    const value = isValidElement<{ value?: unknown }>(child)
      ? child.props.value
      : undefined
    if (typeof value === 'string' && folded.has(value)) return
    rows.push({
      key: typeof value === 'string' ? value : rows.length,
      row: child
    })
  })

  if (rows.length === 0) return null

  return (
    <>
      {title}
      <ul
        data-slot='navigator-capsule'
        aria-labelledby={title !== null ? titleId : undefined}
        className={cn(navigatorCapsuleVariants(), className)}
      >
        {rows.map(({ key, row }) => (
          <li key={key}>{row}</li>
        ))}
      </ul>
    </>
  )
}

NavigatorGroup.displayName = 'Navigator.Group'
