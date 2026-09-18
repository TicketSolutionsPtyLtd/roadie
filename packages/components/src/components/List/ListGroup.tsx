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

/** A titled section of rows inside a `List`. Author it in a client component. */
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
