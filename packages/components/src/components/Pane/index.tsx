// Server-safe property-assignment layer; see COMPOUND_PATTERNS.md.
import { PaneActions } from './PaneActions'
import { PaneBody } from './PaneBody'
import { PaneBodyTitle } from './PaneBodyTitle'
import { PaneFooter } from './PaneFooter'
import { PaneHeader } from './PaneHeader'
import { PaneInspectorTrigger } from './PaneInspectorTrigger'
import { PaneRoot } from './PaneRoot'
import { PaneSearch } from './PaneSearch'
import { PaneTitle } from './PaneTitle'

const Pane = PaneRoot as typeof PaneRoot & {
  Root: typeof PaneRoot
  Body: typeof PaneBody
  Header: typeof PaneHeader
  Title: typeof PaneTitle
  BodyTitle: typeof PaneBodyTitle
  Actions: typeof PaneActions
  Search: typeof PaneSearch
  Footer: typeof PaneFooter
  InspectorTrigger: typeof PaneInspectorTrigger
}

Pane.Root = PaneRoot
Pane.Body = PaneBody
Pane.Header = PaneHeader
Pane.Title = PaneTitle
Pane.BodyTitle = PaneBodyTitle
Pane.Actions = PaneActions
Pane.Search = PaneSearch
Pane.Footer = PaneFooter
Pane.InspectorTrigger = PaneInspectorTrigger

export { Pane }
export type {
  PaneColumn,
  PaneEmphasis,
  PaneInspectorSize,
  PaneMeasure,
  PaneMeasureAlign,
  PaneTabBar
} from './variants'
export type { PaneDepth } from './paneDepth'
export type { PaneRootProps as PaneProps } from './PaneRoot'
export type { PaneBodyProps } from './PaneBody'
export type { PaneHeaderProps } from './PaneHeader'
export type { PaneTitleProps } from './PaneTitle'
export type { PaneBodyTitleProps } from './PaneBodyTitle'
export type { PaneActionsProps } from './PaneActions'
export type { PaneSearchProps } from './PaneSearch'
export type { PaneFooterProps } from './PaneFooter'
export type { PaneInspectorTriggerProps } from './PaneInspectorTrigger'
