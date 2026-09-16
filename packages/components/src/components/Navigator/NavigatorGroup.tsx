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
import { navigatorCapsuleClass } from './variants'

export type NavigatorGroupProps = {
  /** `Navigator.GroupTitle` followed by the group's `Navigator.Item`s. */
  children?: ReactNode
  className?: string
  /** Every item in the group follows it. @default 'automatic' */
  placement?: NavigatorPlacement
  /** Which items stay when space runs out. An item's own wins. @default 'automatic' */
  visibilityPriority?: NavigatorVisibilityPriority
}

/** A titled capsule of items. Author it in a client component. */
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
        className={cn(navigatorCapsuleClass, className)}
      >
        {rows.map(({ key, row }) => (
          <li key={key}>{row}</li>
        ))}
      </ul>
    </>
  )
}

NavigatorGroup.displayName = 'Navigator.Group'
