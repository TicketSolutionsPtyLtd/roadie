// Subpath entry for `@oztix/roadie-components/navigator`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { NavigatorBrand } from './NavigatorBrand'
import { NavigatorContent } from './NavigatorContent'
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorGroupTitle } from './NavigatorGroupTitle'
import { NavigatorItem } from './NavigatorItem'
import { NavigatorMenu } from './NavigatorMenu'
import { NavigatorMenuItem } from './NavigatorMenuItem'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
import { NavigatorOverflowPane } from './NavigatorOverflowPane'
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
  OverflowPane: typeof NavigatorOverflowPane
  OverflowItems: typeof NavigatorOverflowItems
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
Navigator.OverflowPane = NavigatorOverflowPane
Navigator.OverflowItems = NavigatorOverflowItems
Navigator.SecondaryPane = NavigatorSecondaryPane
Navigator.SecondaryItems = NavigatorSecondaryItems

export { Navigator }
export type { NavigatorRootProps as NavigatorProps } from './NavigatorRoot'
export type { NavigatorContentProps } from './NavigatorContent'
export type {
  MobileSlots,
  NavigatorPrimaryProps,
  NavigatorSlotMeta
} from './NavigatorPrimary'
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
export type { NavigatorOverflowPaneProps } from './NavigatorOverflowPane'
export type { NavigatorOverflowItemsProps } from './NavigatorOverflowItems'
export type { NavigatorSecondaryPaneProps } from './NavigatorSecondaryPane'
export type { NavigatorSecondaryItemsProps } from './NavigatorSecondaryItems'
export type { NavigatorIndicatorSurface } from './variants'
export {
  MAX_TABS,
  navigatorRootVariants,
  navigatorContentVariants,
  navigatorPrimaryVerticalVariants,
  navigatorPrimaryBrandVariants,
  navigatorPrimaryClusterVariants,
  navigatorPrimaryClusterViewportVariants,
  navigatorPrimaryClusterContentVariants,
  navigatorCapsuleVariants,
  navigatorPrimaryHorizontalVariants,
  navigatorPrimaryCircleVariants,
  navigatorPrimaryPinnedVariants,
  navigatorPrimaryTrackVariants,
  navigatorPrimaryPillVariants,
  navigatorTabVariants,
  navigatorGroupTitleVariants,
  navigatorItemVariants,
  navigatorBrandVariants,
  navigatorItemTrailingVariants,
  navigatorIndicatorVariants,
  navigatorOverflowVariants,
  navigatorMenuPopupVariants,
  navigatorMenuItemVariants
} from './variants'
