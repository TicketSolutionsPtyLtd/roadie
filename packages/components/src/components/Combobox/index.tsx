// Subpath entry for `@oztix/roadie-components/combobox`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { ComboboxClear } from './ComboboxClear'
import { ComboboxCollection } from './ComboboxCollection'
import { ComboboxEmpty } from './ComboboxEmpty'
import { ComboboxGroup } from './ComboboxGroup'
import { ComboboxGroupLabel } from './ComboboxGroupLabel'
import { ComboboxInput } from './ComboboxInput'
import { ComboboxInputGroup } from './ComboboxInputGroup'
import { ComboboxItem } from './ComboboxItem'
import { ComboboxItemIndicator } from './ComboboxItemIndicator'
import { ComboboxLabel } from './ComboboxLabel'
import { ComboboxList } from './ComboboxList'
import { ComboboxPopup } from './ComboboxPopup'
import { ComboboxPortal } from './ComboboxPortal'
import { ComboboxPositioner } from './ComboboxPositioner'
import { ComboboxRoot } from './ComboboxRoot'
import { ComboboxStatus } from './ComboboxStatus'
import { ComboboxTrigger } from './ComboboxTrigger'

const Combobox = ComboboxRoot as typeof ComboboxRoot & {
  Root: typeof ComboboxRoot
  Label: typeof ComboboxLabel
  InputGroup: typeof ComboboxInputGroup
  Input: typeof ComboboxInput
  Trigger: typeof ComboboxTrigger
  Clear: typeof ComboboxClear
  Portal: typeof ComboboxPortal
  Positioner: typeof ComboboxPositioner
  Popup: typeof ComboboxPopup
  List: typeof ComboboxList
  Item: typeof ComboboxItem
  Collection: typeof ComboboxCollection
  ItemIndicator: typeof ComboboxItemIndicator
  Group: typeof ComboboxGroup
  GroupLabel: typeof ComboboxGroupLabel
  Empty: typeof ComboboxEmpty
  Status: typeof ComboboxStatus
}

Combobox.Root = ComboboxRoot
Combobox.Label = ComboboxLabel
Combobox.InputGroup = ComboboxInputGroup
Combobox.Input = ComboboxInput
Combobox.Trigger = ComboboxTrigger
Combobox.Clear = ComboboxClear
Combobox.Portal = ComboboxPortal
Combobox.Positioner = ComboboxPositioner
Combobox.Popup = ComboboxPopup
Combobox.List = ComboboxList
Combobox.Item = ComboboxItem
Combobox.Collection = ComboboxCollection
Combobox.ItemIndicator = ComboboxItemIndicator
Combobox.Group = ComboboxGroup
Combobox.GroupLabel = ComboboxGroupLabel
Combobox.Empty = ComboboxEmpty
Combobox.Status = ComboboxStatus

export { Combobox }
export type { ComboboxRootProps as ComboboxProps } from './ComboboxRoot'
export type { ComboboxLabelProps } from './ComboboxLabel'
export type { ComboboxInputGroupProps } from './ComboboxInputGroup'
export type { ComboboxInputProps } from './ComboboxInput'
export type { ComboboxTriggerProps } from './ComboboxTrigger'
export type { ComboboxClearProps } from './ComboboxClear'
export type { ComboboxPortalProps } from './ComboboxPortal'
export type { ComboboxPositionerProps } from './ComboboxPositioner'
export type { ComboboxPopupProps } from './ComboboxPopup'
export type { ComboboxListProps } from './ComboboxList'
export type { ComboboxItemProps } from './ComboboxItem'
export type { ComboboxCollectionProps } from './ComboboxCollection'
export type { ComboboxItemIndicatorProps } from './ComboboxItemIndicator'
export type { ComboboxGroupProps } from './ComboboxGroup'
export type { ComboboxGroupLabelProps } from './ComboboxGroupLabel'
export type { ComboboxEmptyProps } from './ComboboxEmpty'
export type { ComboboxStatusProps } from './ComboboxStatus'
export { comboboxInputGroupVariants } from './variants'
export { useFilter, type Filter, type FilterOptions } from './useFilter'
