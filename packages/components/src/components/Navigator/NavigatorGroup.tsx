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

import {
  NavigatorGroupTitle,
  type NavigatorGroupTitleProps
} from './NavigatorGroupTitle'
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
import { navigatorGroupListVariants } from './variants'

export type NavigatorGroupProps = {
  /** `Navigator.GroupTitle` followed by the group's `Navigator.Item`s. */
  children?: ReactNode
  className?: string
}

/**
 * A headed run of `Navigator.Item`s, in the primary navigation or inside a
 * `Navigator.Secondary`. Emits its title and its own `<ul>` as siblings.
 *
 * On the mobile strip the group flattens: the title renders as `sr-only`
 * text (not the `<h2>` itself — `sr-only` keeps content in the accessibility
 * tree, so the heading would still land in a screen reader's outline for what
 * is otherwise a single horizontal control row) and the items render inline.
 *
 * Author inside a client component. The title is found by element reference,
 * and Flight replaces the type of every element authored in a server component
 * with a `React.lazy` wrapper. See COMPOUND_PATTERNS.md §1.2.
 */
export function NavigatorGroup({ children, className }: NavigatorGroupProps) {
  const presentation = use(NavigatorPresentationContext)
  const titleId = useId()
  let title: ReactNode = null
  const rows: ReactNode[] = []
  let titleChildren: ReactNode = null

  Children.forEach(children, (child) => {
    if (
      isValidElement<NavigatorGroupTitleProps>(child) &&
      child.type === NavigatorGroupTitle
    ) {
      // Injected rather than required from the call site: the association is
      // what makes the run announce as a named list, and it should not be
      // something a consumer can forget.
      title = cloneElement(child, { id: titleId })
      titleChildren = child.props.children
      return
    }
    rows.push(child)
  })

  if (presentation === 'strip') {
    return (
      <>
        {titleChildren !== null ? (
          <span className='sr-only'>{titleChildren}</span>
        ) : null}
        {rows}
      </>
    )
  }

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
