// Server-safe property-assignment layer; see COMPOUND_PATTERNS.md.
import { NavigatorBrand } from './NavigatorBrand'
import { NavigatorContent } from './NavigatorContent'
import { NavigatorExpandToggle } from './NavigatorExpandToggle'
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorGroupTitle } from './NavigatorGroupTitle'
import { NavigatorItem } from './NavigatorItem'
import { NavigatorMenu } from './NavigatorMenu'
import { NavigatorMenuItem } from './NavigatorMenuItem'
import { NavigatorPrimary } from './NavigatorPrimary'
import { NavigatorRoot } from './NavigatorRoot'
import { NavigatorSecondary } from './NavigatorSecondary'
import { NavigatorSecondaryItems } from './NavigatorSecondaryItems'
import { NavigatorSecondaryPane } from './NavigatorSecondaryPane'

const Navigator = NavigatorRoot as typeof NavigatorRoot & {
  Root: typeof NavigatorRoot
  Content: typeof NavigatorContent
  Primary: typeof NavigatorPrimary
  Secondary: typeof NavigatorSecondary
  Item: typeof NavigatorItem
  Group: typeof NavigatorGroup
  GroupTitle: typeof NavigatorGroupTitle
  Menu: typeof NavigatorMenu
  MenuItem: typeof NavigatorMenuItem
  Brand: typeof NavigatorBrand
  ExpandToggle: typeof NavigatorExpandToggle
  SecondaryPane: typeof NavigatorSecondaryPane
  SecondaryItems: typeof NavigatorSecondaryItems
}

Navigator.Root = NavigatorRoot
Navigator.Content = NavigatorContent
Navigator.Primary = NavigatorPrimary
Navigator.Secondary = NavigatorSecondary
Navigator.Item = NavigatorItem
Navigator.Group = NavigatorGroup
Navigator.GroupTitle = NavigatorGroupTitle
Navigator.Menu = NavigatorMenu
Navigator.MenuItem = NavigatorMenuItem
Navigator.Brand = NavigatorBrand
Navigator.ExpandToggle = NavigatorExpandToggle
Navigator.SecondaryPane = NavigatorSecondaryPane
Navigator.SecondaryItems = NavigatorSecondaryItems

export { Navigator }
export { useNavigatorSecondary } from './useNavigatorSecondary'
export type {
  NavigatorSecondaryData,
  NavigatorSecondaryGroup,
  NavigatorSecondaryItem
} from './secondaryData'
export type { NavigatorRootProps as NavigatorProps } from './NavigatorRoot'
export type { NavigatorContentProps } from './NavigatorContent'
export type { NavigatorPrimaryProps } from './NavigatorPrimary'
export type {
  NavigatorPlacement,
  NavigatorVisibilityPriority
} from './mobileSlots'
export type { NavigatorSecondaryProps } from './NavigatorSecondary'
export type { NavigatorItemProps } from './NavigatorItem'
export type { NavigatorGroupProps } from './NavigatorGroup'
export type { NavigatorGroupTitleProps } from './NavigatorGroupTitle'
export type { NavigatorMenuProps } from './NavigatorMenu'
export type { NavigatorMenuItemProps } from './NavigatorMenuItem'
export type { NavigatorBrandProps } from './NavigatorBrand'
export type { NavigatorExpandToggleProps } from './NavigatorExpandToggle'
export type { NavigatorSecondaryPaneProps } from './NavigatorSecondaryPane'
export type { NavigatorSecondaryItemsProps } from './NavigatorSecondaryItems'
