'use client'

import {
  Children,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  use,
  useId
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  NavigatorFoldAtContext,
  NavigatorFoldedContext,
  foldBelow
} from './NavigatorFoldedContext'
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
  const at = use(NavigatorFoldAtContext)
  let title: ReactElement<NavigatorGroupTitleProps> | null = null
  const rows: { key: string | number; row: ReactNode }[] = []

  Children.forEach(children, (child) => {
    if (
      isValidElement<NavigatorGroupTitleProps>(child) &&
      child.type === NavigatorGroupTitle
    ) {
      title = child
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
  const groupFoldsBelow = foldBelow(
    at,
    rows.flatMap(({ key }) => (typeof key === 'string' ? [key] : []))
  )
  const titleProps: Partial<NavigatorGroupTitleProps> & {
    'data-fold-below'?: string
  } = { id: titleId, 'data-fold-below': groupFoldsBelow }

  return (
    <>
      {title && cloneElement(title, titleProps)}
      <ul
        data-slot='navigator-capsule'
        data-fold-below={groupFoldsBelow}
        aria-labelledby={title !== null ? titleId : undefined}
        className={cn(navigatorCapsuleClass, className)}
      >
        {rows.map(({ key, row }) => (
          <li
            key={key}
            data-fold-below={
              typeof key === 'string' ? foldBelow(at, [key]) : undefined
            }
          >
            {row}
          </li>
        ))}
      </ul>
    </>
  )
}

NavigatorGroup.displayName = 'Navigator.Group'
