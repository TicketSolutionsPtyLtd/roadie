// No 'use client': dot access must work from server components.
import { MenuCheckboxItem } from './MenuCheckboxItem'
import { MenuContent } from './MenuContent'
import { MenuGroup } from './MenuGroup'
import { MenuGroupLabel } from './MenuGroupLabel'
import { MenuItem } from './MenuItem'
import { MenuPopup } from './MenuPopup'
import { MenuPortal } from './MenuPortal'
import { MenuPositioner } from './MenuPositioner'
import { MenuRadioGroup } from './MenuRadioGroup'
import { MenuRadioItem } from './MenuRadioItem'
import { MenuRoot } from './MenuRoot'
import { MenuSeparator } from './MenuSeparator'
import { MenuSubmenuRoot } from './MenuSubmenuRoot'
import { MenuSubmenuTrigger } from './MenuSubmenuTrigger'
import { MenuTrigger } from './MenuTrigger'

const Menu = MenuRoot as typeof MenuRoot & {
  Root: typeof MenuRoot
  Trigger: typeof MenuTrigger
  Portal: typeof MenuPortal
  Positioner: typeof MenuPositioner
  Popup: typeof MenuPopup
  Content: typeof MenuContent
  Item: typeof MenuItem
  Separator: typeof MenuSeparator
  Group: typeof MenuGroup
  GroupLabel: typeof MenuGroupLabel
  CheckboxItem: typeof MenuCheckboxItem
  RadioGroup: typeof MenuRadioGroup
  RadioItem: typeof MenuRadioItem
  SubmenuRoot: typeof MenuSubmenuRoot
  SubmenuTrigger: typeof MenuSubmenuTrigger
}

Menu.Root = MenuRoot
Menu.Trigger = MenuTrigger
Menu.Portal = MenuPortal
Menu.Positioner = MenuPositioner
Menu.Popup = MenuPopup
Menu.Content = MenuContent
Menu.Item = MenuItem
Menu.Separator = MenuSeparator
Menu.Group = MenuGroup
Menu.GroupLabel = MenuGroupLabel
Menu.CheckboxItem = MenuCheckboxItem
Menu.RadioGroup = MenuRadioGroup
Menu.RadioItem = MenuRadioItem
Menu.SubmenuRoot = MenuSubmenuRoot
Menu.SubmenuTrigger = MenuSubmenuTrigger

export { Menu }
export type { MenuRootProps as MenuProps } from './MenuRoot'
export type { MenuTriggerProps } from './MenuTrigger'
export type { MenuPortalProps } from './MenuPortal'
export type { MenuPositionerProps } from './MenuPositioner'
export type { MenuPopupProps } from './MenuPopup'
export type { MenuContentProps } from './MenuContent'
export type { MenuItemProps } from './MenuItem'
export type { MenuSeparatorProps } from './MenuSeparator'
export type { MenuGroupProps } from './MenuGroup'
export type { MenuGroupLabelProps } from './MenuGroupLabel'
export type { MenuCheckboxItemProps } from './MenuCheckboxItem'
export type { MenuRadioGroupProps } from './MenuRadioGroup'
export type { MenuRadioItemProps } from './MenuRadioItem'
export type { MenuSubmenuRootProps } from './MenuSubmenuRoot'
export type { MenuSubmenuTriggerProps } from './MenuSubmenuTrigger'
export { menuItemVariants } from './variants'
