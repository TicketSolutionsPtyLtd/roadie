// Subpath entry for `@oztix/roadie-components/list`.
// NO `'use client'` — server-safe property-assignment layer.
import { ListGroup } from './ListGroup'
import { ListGroupTitle } from './ListGroupTitle'
import { ListItem } from './ListItem'
import { ListRoot } from './ListRoot'

const List = ListRoot as typeof ListRoot & {
  Root: typeof ListRoot
  Item: typeof ListItem
  Group: typeof ListGroup
  GroupTitle: typeof ListGroupTitle
}

List.Root = ListRoot
List.Item = ListItem
List.Group = ListGroup
List.GroupTitle = ListGroupTitle

export { List }
export type { ListRootProps as ListProps, ListEmphasis } from './ListRoot'
export type { ListItemCurrent, ListItemProps } from './ListItem'
export type { ListGroupProps } from './ListGroup'
export type { ListGroupTitleProps } from './ListGroupTitle'
export {
  listVariants,
  listItemVariants,
  listGroupVariants,
  listGroupTitleVariants
} from './variants'
