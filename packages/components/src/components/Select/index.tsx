// Subpath entry for `@oztix/roadie-components/select`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { SelectContent } from './SelectContent'
import { SelectErrorText } from './SelectErrorText'
import { SelectGroup } from './SelectGroup'
import { SelectGroupLabel } from './SelectGroupLabel'
import { SelectHelperText } from './SelectHelperText'
import { SelectIcon } from './SelectIcon'
import { SelectItem } from './SelectItem'
import { SelectItemIndicator } from './SelectItemIndicator'
import { SelectItemText } from './SelectItemText'
import { SelectLabel } from './SelectLabel'
import { SelectPopup } from './SelectPopup'
import { SelectPortal } from './SelectPortal'
import { SelectPositioner } from './SelectPositioner'
import { SelectRoot } from './SelectRoot'
import { SelectScrollDownArrow } from './SelectScrollDownArrow'
import { SelectScrollUpArrow } from './SelectScrollUpArrow'
import { SelectTrigger } from './SelectTrigger'
import { SelectValue } from './SelectValue'

const Select = SelectRoot as typeof SelectRoot & {
  Root: typeof SelectRoot
  Trigger: typeof SelectTrigger
  Value: typeof SelectValue
  Icon: typeof SelectIcon
  Portal: typeof SelectPortal
  Positioner: typeof SelectPositioner
  Popup: typeof SelectPopup
  Content: typeof SelectContent
  Item: typeof SelectItem
  ItemText: typeof SelectItemText
  ItemIndicator: typeof SelectItemIndicator
  Group: typeof SelectGroup
  GroupLabel: typeof SelectGroupLabel
  Label: typeof SelectLabel
  HelperText: typeof SelectHelperText
  ErrorText: typeof SelectErrorText
  ScrollUpArrow: typeof SelectScrollUpArrow
  ScrollDownArrow: typeof SelectScrollDownArrow
}

Select.Root = SelectRoot
Select.Trigger = SelectTrigger
Select.Value = SelectValue
Select.Icon = SelectIcon
Select.Portal = SelectPortal
Select.Positioner = SelectPositioner
Select.Popup = SelectPopup
Select.Content = SelectContent
Select.Item = SelectItem
Select.ItemText = SelectItemText
Select.ItemIndicator = SelectItemIndicator
Select.Group = SelectGroup
Select.GroupLabel = SelectGroupLabel
Select.Label = SelectLabel
Select.HelperText = SelectHelperText
Select.ErrorText = SelectErrorText
Select.ScrollUpArrow = SelectScrollUpArrow
Select.ScrollDownArrow = SelectScrollDownArrow

export { Select }
export type { SelectRootProps as SelectProps } from './SelectRoot'
export type { SelectTriggerProps } from './SelectTrigger'
export type { SelectValueProps } from './SelectValue'
export type { SelectIconProps } from './SelectIcon'
export type { SelectPortalProps } from './SelectPortal'
export type { SelectPositionerProps } from './SelectPositioner'
export type { SelectPopupProps } from './SelectPopup'
export type { SelectContentProps } from './SelectContent'
export type { SelectItemProps } from './SelectItem'
export type { SelectItemTextProps } from './SelectItemText'
export type { SelectItemIndicatorProps } from './SelectItemIndicator'
export type { SelectGroupProps } from './SelectGroup'
export type { SelectGroupLabelProps } from './SelectGroupLabel'
export type { SelectLabelProps } from './SelectLabel'
export type { SelectHelperTextProps } from './SelectHelperText'
export type { SelectErrorTextProps } from './SelectErrorText'
export type { SelectScrollUpArrowProps } from './SelectScrollUpArrow'
export type { SelectScrollDownArrowProps } from './SelectScrollDownArrow'
export { selectTriggerVariants } from './variants'
