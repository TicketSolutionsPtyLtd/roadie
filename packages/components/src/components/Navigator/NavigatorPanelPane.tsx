'use client'

import { isValidElement } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneRoot } from '../Pane/PaneRoot'
import type { NavigatorPanelProps } from './NavigatorPanel'
import type { NavigatorSlotMeta } from './NavigatorPrimary'
import { navigatorPanelPaneVariants } from './variants'

export type NavigatorPanelPaneProps = {
  slot: NavigatorSlotMeta
}

/**
 * A panel's below-`md` rendering: a full-screen `Pane`, pushed to the top of
 * `Navigator.Content`'s stack, with the tab bar still visible
 * (`primaryNav='visible'`) — the panel item's own tab, not a separate
 * surface. `Navigator.Primary` marks that tab `expanded` and reads it as the
 * selected one while this is mounted, so there is nothing here to select —
 * a tab root has no Back, and this renders no `Pane.Header` of its own.
 * Dismissal is tapping another tab, tapping this tab again to toggle it off,
 * or Escape, all handled by `Navigator.Primary`.
 *
 * Mounted only while its value is the open panel — one pane at a time, never
 * one per declared panel.
 */
export function NavigatorPanelPane({ slot }: NavigatorPanelPaneProps) {
  const panel = isValidElement<NavigatorPanelProps>(slot.panel)
    ? slot.panel.props
    : null
  if (!panel) return null

  const ariaLabel =
    panel['aria-label'] ??
    (typeof slot.label === 'string' ? slot.label : undefined)

  return (
    <PaneRoot
      role='detail'
      current
      primaryNav='visible'
      aria-label={ariaLabel}
      className={cn(navigatorPanelPaneVariants(), panel.className)}
    >
      {panel.children}
    </PaneRoot>
  )
}

NavigatorPanelPane.displayName = 'NavigatorPanelPane'
