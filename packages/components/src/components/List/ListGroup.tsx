import {
  Children,
  type ReactNode,
  cloneElement,
  isValidElement,
  useId
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { ListGroupTitle, type ListGroupTitleProps } from './ListGroupTitle'
import {
  listGroupSectionClass,
  listGroupVariants,
  listSectionClass
} from './variants'

export type ListGroupProps = {
  /** `List.GroupTitle` followed by the group's `List.Item`s. */
  children?: ReactNode
  className?: string
}

/**
 * A titled section of rows inside a `List`. Renders an `<li>` holding the title
 * and its own `<ul>`, so a list can mix loose rows and groups and stay valid
 * HTML. When the list is `contained`, each group is its own card.
 *
 * Author inside a client component. The title is found by element reference,
 * and Flight replaces the type of every element authored in a server component
 * with a `React.lazy` wrapper — a title declared there would land inside the
 * section instead of above it. See COMPOUND_PATTERNS.md §1.2.
 */
export function ListGroup({ children, className }: ListGroupProps) {
  const generatedId = useId()
  let titleId = generatedId
  let title: ReactNode = null
  const rows: ReactNode[] = []

  Children.forEach(children, (child) => {
    if (
      isValidElement<ListGroupTitleProps>(child) &&
      child.type === ListGroupTitle
    ) {
      // The id is injected rather than required from the consumer: the
      // association is what makes the section announce as a named list, and
      // it should not be something a call site can forget.
      titleId = child.props.id ?? generatedId
      title = cloneElement(child, { id: titleId })
      return
    }
    rows.push(child)
  })

  return (
    <li data-slot='list-group' className={cn(listGroupVariants(), className)}>
      {title}
      <ul
        data-slot='list-section'
        aria-labelledby={title !== null ? titleId : undefined}
        className={cn(listSectionClass, listGroupSectionClass)}
      >
        {rows}
      </ul>
    </li>
  )
}

ListGroup.displayName = 'List.Group'
