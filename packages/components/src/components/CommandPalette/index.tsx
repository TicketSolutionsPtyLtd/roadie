// NO 'use client': server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { CommandPaletteCollection } from './CommandPaletteCollection'
import { CommandPaletteEmpty } from './CommandPaletteEmpty'
import { CommandPaletteGroup } from './CommandPaletteGroup'
import { CommandPaletteGroupLabel } from './CommandPaletteGroupLabel'
import { CommandPaletteInput } from './CommandPaletteInput'
import { CommandPaletteItem } from './CommandPaletteItem'
import { CommandPaletteList } from './CommandPaletteList'
import { CommandPaletteRoot } from './CommandPaletteRoot'

const CommandPalette = CommandPaletteRoot as typeof CommandPaletteRoot & {
  Root: typeof CommandPaletteRoot
  Input: typeof CommandPaletteInput
  List: typeof CommandPaletteList
  Group: typeof CommandPaletteGroup
  GroupLabel: typeof CommandPaletteGroupLabel
  Collection: typeof CommandPaletteCollection
  Item: typeof CommandPaletteItem
  Empty: typeof CommandPaletteEmpty
}

CommandPalette.Root = CommandPaletteRoot
CommandPalette.Input = CommandPaletteInput
CommandPalette.List = CommandPaletteList
CommandPalette.Group = CommandPaletteGroup
CommandPalette.GroupLabel = CommandPaletteGroupLabel
CommandPalette.Collection = CommandPaletteCollection
CommandPalette.Item = CommandPaletteItem
CommandPalette.Empty = CommandPaletteEmpty

export { CommandPalette }
export type {
  CommandPaletteRootProps as CommandPaletteProps,
  CommandPaletteOpenChangeDetails,
  CommandPaletteCommand
} from './CommandPaletteRoot'
export type { CommandPaletteInputProps } from './CommandPaletteInput'
export type { CommandPaletteListProps } from './CommandPaletteList'
export type { CommandPaletteGroupProps } from './CommandPaletteGroup'
export type { CommandPaletteGroupLabelProps } from './CommandPaletteGroupLabel'
export type { CommandPaletteCollectionProps } from './CommandPaletteCollection'
export type { CommandPaletteItemProps } from './CommandPaletteItem'
export type { CommandPaletteEmptyProps } from './CommandPaletteEmpty'
