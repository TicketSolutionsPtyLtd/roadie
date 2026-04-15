// Subpath entry for `@oztix/roadie-components/autocomplete`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { AutocompleteClear } from './AutocompleteClear'
import { AutocompleteCollection } from './AutocompleteCollection'
import { AutocompleteEmpty } from './AutocompleteEmpty'
import { AutocompleteGroup } from './AutocompleteGroup'
import { AutocompleteGroupLabel } from './AutocompleteGroupLabel'
import { AutocompleteInput } from './AutocompleteInput'
import { AutocompleteInputGroup } from './AutocompleteInputGroup'
import { AutocompleteItem } from './AutocompleteItem'
import { AutocompleteList } from './AutocompleteList'
import { AutocompletePopup } from './AutocompletePopup'
import { AutocompletePortal } from './AutocompletePortal'
import { AutocompletePositioner } from './AutocompletePositioner'
import { AutocompleteRoot } from './AutocompleteRoot'
import { AutocompleteStatus } from './AutocompleteStatus'
import { AutocompleteTrigger } from './AutocompleteTrigger'
import { AutocompleteValue } from './AutocompleteValue'

const Autocomplete = AutocompleteRoot as typeof AutocompleteRoot & {
  Root: typeof AutocompleteRoot
  Value: typeof AutocompleteValue
  InputGroup: typeof AutocompleteInputGroup
  Input: typeof AutocompleteInput
  Trigger: typeof AutocompleteTrigger
  Clear: typeof AutocompleteClear
  Portal: typeof AutocompletePortal
  Positioner: typeof AutocompletePositioner
  Popup: typeof AutocompletePopup
  List: typeof AutocompleteList
  Item: typeof AutocompleteItem
  Collection: typeof AutocompleteCollection
  Group: typeof AutocompleteGroup
  GroupLabel: typeof AutocompleteGroupLabel
  Empty: typeof AutocompleteEmpty
  Status: typeof AutocompleteStatus
}

Autocomplete.Root = AutocompleteRoot
Autocomplete.Value = AutocompleteValue
Autocomplete.InputGroup = AutocompleteInputGroup
Autocomplete.Input = AutocompleteInput
Autocomplete.Trigger = AutocompleteTrigger
Autocomplete.Clear = AutocompleteClear
Autocomplete.Portal = AutocompletePortal
Autocomplete.Positioner = AutocompletePositioner
Autocomplete.Popup = AutocompletePopup
Autocomplete.List = AutocompleteList
Autocomplete.Item = AutocompleteItem
Autocomplete.Collection = AutocompleteCollection
Autocomplete.Group = AutocompleteGroup
Autocomplete.GroupLabel = AutocompleteGroupLabel
Autocomplete.Empty = AutocompleteEmpty
Autocomplete.Status = AutocompleteStatus

export { Autocomplete }
export type { AutocompleteRootProps as AutocompleteProps } from './AutocompleteRoot'
export type { AutocompleteValueProps } from './AutocompleteValue'
export type { AutocompleteInputGroupProps } from './AutocompleteInputGroup'
export type { AutocompleteInputProps } from './AutocompleteInput'
export type { AutocompleteTriggerProps } from './AutocompleteTrigger'
export type { AutocompleteClearProps } from './AutocompleteClear'
export type { AutocompletePortalProps } from './AutocompletePortal'
export type { AutocompletePositionerProps } from './AutocompletePositioner'
export type { AutocompletePopupProps } from './AutocompletePopup'
export type { AutocompleteListProps } from './AutocompleteList'
export type { AutocompleteItemProps } from './AutocompleteItem'
export type { AutocompleteCollectionProps } from './AutocompleteCollection'
export type { AutocompleteGroupProps } from './AutocompleteGroup'
export type { AutocompleteGroupLabelProps } from './AutocompleteGroupLabel'
export type { AutocompleteEmptyProps } from './AutocompleteEmpty'
export type { AutocompleteStatusProps } from './AutocompleteStatus'
export { autocompleteInputGroupVariants } from './variants'
export {
  useFilter,
  useFilteredItems,
  type Filter,
  type FilterOptions
} from './useFilter'
