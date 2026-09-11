// Subpath entry for `@oztix/roadie-components/navigator`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { NavigatorBrand } from './NavigatorBrand'
import { NavigatorContent } from './NavigatorContent'
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorGroupTitle } from './NavigatorGroupTitle'
import { NavigatorItem } from './NavigatorItem'
import { NavigatorOverflow } from './NavigatorOverflow'
import { NavigatorOverflowItems } from './NavigatorOverflowItems'
import { NavigatorPanel } from './NavigatorPanel'
import { NavigatorPrimary } from './NavigatorPrimary'
import { NavigatorRoot } from './NavigatorRoot'
import { NavigatorSecondary } from './NavigatorSecondary'

const Navigator = NavigatorRoot as typeof NavigatorRoot & {
  Root: typeof NavigatorRoot
  Content: typeof NavigatorContent
  Primary: typeof NavigatorPrimary
  Secondary: typeof NavigatorSecondary
  Item: typeof NavigatorItem
  Group: typeof NavigatorGroup
  GroupTitle: typeof NavigatorGroupTitle
  Panel: typeof NavigatorPanel
  Brand: typeof NavigatorBrand
  Overflow: typeof NavigatorOverflow
  OverflowItems: typeof NavigatorOverflowItems
}

Navigator.Root = NavigatorRoot
Navigator.Content = NavigatorContent
Navigator.Primary = NavigatorPrimary
Navigator.Secondary = NavigatorSecondary
Navigator.Item = NavigatorItem
Navigator.Group = NavigatorGroup
Navigator.GroupTitle = NavigatorGroupTitle
Navigator.Panel = NavigatorPanel
Navigator.Brand = NavigatorBrand
Navigator.Overflow = NavigatorOverflow
Navigator.OverflowItems = NavigatorOverflowItems

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
export type { NavigatorPanelProps } from './NavigatorPanel'
export type { NavigatorBrandProps } from './NavigatorBrand'
export type { NavigatorOverflowProps } from './NavigatorOverflow'
export type { NavigatorOverflowItemsProps } from './NavigatorOverflowItems'
export type { NavigatorIndicatorSurface } from './variants'
export {
  MAX_TABS,
  navigatorRootVariants,
  navigatorContentVariants,
  navigatorPrimaryVerticalVariants,
  navigatorPrimaryHorizontalVariants,
  navigatorPrimaryCircleVariants,
  navigatorPrimaryPinnedVariants,
  navigatorPrimaryTrackVariants,
  navigatorPrimaryPillVariants,
  navigatorTabVariants,
  navigatorSecondaryVariants,
  navigatorSecondaryStripVariants,
  navigatorSecondaryStripViewportVariants,
  navigatorSecondaryStripContentVariants,
  navigatorGroupTitleVariants,
  navigatorGroupListVariants,
  navigatorPrimaryListVariants,
  navigatorItemVariants,
  navigatorBrandVariants,
  navigatorItemTrailingVariants,
  navigatorChevronVariants,
  navigatorIndicatorVariants,
  navigatorOverflowVariants
} from './variants'
