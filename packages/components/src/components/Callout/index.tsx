// Server-safe subpath entry — no 'use client'. See COMPOUND_PATTERNS.md.
import { CalloutActions } from './CalloutActions'
import { CalloutDescription } from './CalloutDescription'
import { CalloutIcon } from './CalloutIcon'
import { CalloutRoot } from './CalloutRoot'
import { CalloutTitle } from './CalloutTitle'

const Callout = CalloutRoot as typeof CalloutRoot & {
  Root: typeof CalloutRoot
  Icon: typeof CalloutIcon
  Title: typeof CalloutTitle
  Description: typeof CalloutDescription
  Actions: typeof CalloutActions
}

Callout.Root = CalloutRoot
Callout.Icon = CalloutIcon
Callout.Title = CalloutTitle
Callout.Description = CalloutDescription
Callout.Actions = CalloutActions

export { Callout }
export type { CalloutProps } from './CalloutRoot'
export type { CalloutIconProps } from './CalloutIcon'
export type { CalloutTitleProps } from './CalloutTitle'
export type { CalloutDescriptionProps } from './CalloutDescription'
export type { CalloutActionsProps } from './CalloutActions'
export { calloutVariants } from './variants'
export type { CalloutEmphasis } from './variants'
