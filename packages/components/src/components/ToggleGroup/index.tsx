// NO `'use client'`: server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { ToggleGroupItem } from './ToggleGroupItem'
import { ToggleGroupRoot } from './ToggleGroupRoot'

const ToggleGroup = ToggleGroupRoot as typeof ToggleGroupRoot & {
  Root: typeof ToggleGroupRoot
  Item: typeof ToggleGroupItem
}

ToggleGroup.Root = ToggleGroupRoot
ToggleGroup.Item = ToggleGroupItem

export { ToggleGroup }
export type { ToggleGroupRootProps as ToggleGroupProps } from './ToggleGroupRoot'
export type { ToggleGroupItemProps } from './ToggleGroupItem'
export type { ToggleGroupDirection, ToggleGroupSize } from './variants'
export {
  toggleGroupVariants,
  toggleGroupItemVariants,
  toggleGroupIndicatorVariants
} from './variants'
