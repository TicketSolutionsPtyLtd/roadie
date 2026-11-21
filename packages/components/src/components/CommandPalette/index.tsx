// NO 'use client': server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { CommandPaletteCollection } from './CommandPaletteCollection'
import { CommandPaletteEmpty } from './CommandPaletteEmpty'
import { CommandPaletteFooter } from './CommandPaletteFooter'
import { CommandPaletteGroup } from './CommandPaletteGroup'
import { CommandPaletteGroupLabel } from './CommandPaletteGroupLabel'
import { CommandPaletteHint } from './CommandPaletteHint'
import { CommandPaletteInput } from './CommandPaletteInput'
import { CommandPaletteItem } from './CommandPaletteItem'
import { CommandPaletteList } from './CommandPaletteList'
import { CommandPalettePage } from './CommandPalettePage'
import { CommandPaletteRoot } from './CommandPaletteRoot'
import { CommandPaletteScope } from './CommandPaletteScope'
import { CommandPaletteScopes } from './CommandPaletteScopes'
import { CommandPaletteTrigger } from './CommandPaletteTrigger'

const CommandPalette = CommandPaletteRoot as typeof CommandPaletteRoot & {
  Root: typeof CommandPaletteRoot
  Trigger: typeof CommandPaletteTrigger
  Input: typeof CommandPaletteInput
  List: typeof CommandPaletteList
  Group: typeof CommandPaletteGroup
  GroupLabel: typeof CommandPaletteGroupLabel
  Collection: typeof CommandPaletteCollection
  Item: typeof CommandPaletteItem
  Empty: typeof CommandPaletteEmpty
  Hint: typeof CommandPaletteHint
  Footer: typeof CommandPaletteFooter
  Scope: typeof CommandPaletteScope
  Scopes: typeof CommandPaletteScopes
  Page: typeof CommandPalettePage
}

CommandPalette.Root = CommandPaletteRoot
CommandPalette.Trigger = CommandPaletteTrigger
CommandPalette.Input = CommandPaletteInput
CommandPalette.List = CommandPaletteList
CommandPalette.Group = CommandPaletteGroup
CommandPalette.GroupLabel = CommandPaletteGroupLabel
CommandPalette.Collection = CommandPaletteCollection
CommandPalette.Item = CommandPaletteItem
CommandPalette.Empty = CommandPaletteEmpty
CommandPalette.Hint = CommandPaletteHint
CommandPalette.Footer = CommandPaletteFooter
CommandPalette.Scope = CommandPaletteScope
CommandPalette.Scopes = CommandPaletteScopes
CommandPalette.Page = CommandPalettePage

export { CommandPalette }
export type {
  CommandPaletteRootProps as CommandPaletteProps,
  CommandPaletteOpenChangeDetails,
  CommandPaletteCommand
} from './CommandPaletteRoot'
export type { CommandPaletteTriggerProps } from './CommandPaletteTrigger'
export type { CommandPaletteInputProps } from './CommandPaletteInput'
export type { CommandPaletteListProps } from './CommandPaletteList'
export type { CommandPaletteGroupProps } from './CommandPaletteGroup'
export type { CommandPaletteGroupLabelProps } from './CommandPaletteGroupLabel'
export type { CommandPaletteCollectionProps } from './CommandPaletteCollection'
export type { CommandPaletteItemProps } from './CommandPaletteItem'
export type { CommandPaletteEmptyProps } from './CommandPaletteEmpty'
export type { CommandPaletteHintProps } from './CommandPaletteHint'
export type { CommandPaletteFooterProps } from './CommandPaletteFooter'
export type { CommandPaletteScopeProps } from './CommandPaletteScope'
export type { CommandPaletteScopesProps } from './CommandPaletteScopes'
export type { CommandPalettePageProps } from './CommandPalettePage'
