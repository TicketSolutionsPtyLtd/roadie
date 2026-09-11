// Subpath entry for `@oztix/roadie-components/pane`.
// NO `'use client'` — server-safe property-assignment layer.
import { PaneActions } from './PaneActions'
import { PaneBodyTitle } from './PaneBodyTitle'
import { PaneFooter } from './PaneFooter'
import { PaneHeader } from './PaneHeader'
import { PaneRoot } from './PaneRoot'
import { PaneSearch } from './PaneSearch'
import { PaneTitle } from './PaneTitle'

const Pane = PaneRoot as typeof PaneRoot & {
  Root: typeof PaneRoot
  Header: typeof PaneHeader
  Title: typeof PaneTitle
  BodyTitle: typeof PaneBodyTitle
  Actions: typeof PaneActions
  Search: typeof PaneSearch
  Footer: typeof PaneFooter
}

Pane.Root = PaneRoot
Pane.Header = PaneHeader
Pane.Title = PaneTitle
Pane.BodyTitle = PaneBodyTitle
Pane.Actions = PaneActions
Pane.Search = PaneSearch
Pane.Footer = PaneFooter

export { Pane }
export type { PaneRole, PaneEmphasis, PanePrimaryNav } from './variants'
export type { PaneRootProps as PaneProps } from './PaneRoot'
export type { PaneHeaderProps } from './PaneHeader'
export type { PaneTitleProps } from './PaneTitle'
export type { PaneBodyTitleProps } from './PaneBodyTitle'
export type { PaneActionsProps } from './PaneActions'
export type { PaneSearchProps } from './PaneSearch'
export type { PaneFooterProps } from './PaneFooter'
