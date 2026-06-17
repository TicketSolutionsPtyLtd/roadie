// Subpath entry for `@oztix/roadie-components/empty-state`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { EmptyStateActions } from './EmptyStateActions'
import { EmptyStateDescription } from './EmptyStateDescription'
import { EmptyStateIconTile } from './EmptyStateIconTile'
import { EmptyStateIllustration } from './EmptyStateIllustration'
import { EmptyStateRoot } from './EmptyStateRoot'
import { EmptyStateTitle } from './EmptyStateTitle'

const EmptyState = EmptyStateRoot as typeof EmptyStateRoot & {
  Root: typeof EmptyStateRoot
  IconTile: typeof EmptyStateIconTile
  Illustration: typeof EmptyStateIllustration
  Title: typeof EmptyStateTitle
  Description: typeof EmptyStateDescription
  Actions: typeof EmptyStateActions
}

EmptyState.Root = EmptyStateRoot
EmptyState.IconTile = EmptyStateIconTile
EmptyState.Illustration = EmptyStateIllustration
EmptyState.Title = EmptyStateTitle
EmptyState.Description = EmptyStateDescription
EmptyState.Actions = EmptyStateActions

export { EmptyState }
export type { EmptyStateProps } from './EmptyStateRoot'
export type { EmptyStateTitleProps } from './EmptyStateTitle'
export type { EmptyStateDescriptionProps } from './EmptyStateDescription'
export type { EmptyStateIconTileProps } from './EmptyStateIconTile'
export type { EmptyStateIllustrationProps } from './EmptyStateIllustration'
export type { EmptyStateActionsProps } from './EmptyStateActions'
export { emptyStateVariants } from './variants'
export type { EmptyStateSize, EmptyStateIntent } from './variants'
