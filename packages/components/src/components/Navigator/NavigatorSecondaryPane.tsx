'use client'

import { use, useEffect } from 'react'

import { PaneRoot, type PaneRootProps } from '../Pane/PaneRoot'
import { PaneKindContext, PaneStackContext } from '../Pane/PaneStackContext'
import {
  NavigatorActionsContext,
  NavigatorDisclosureContext,
  NavigatorSelectionContext
} from './NavigatorContext'

export type NavigatorSecondaryPaneProps = Omit<
  PaneRootProps,
  'role' | 'current' | 'depth' | 'primaryNav' | 'id'
> & {
  /** The section whose generated pane this replaces. */
  value: string
}

/** Replaces one section's generated list pane; declare it before your detail pane. */
export function NavigatorSecondaryPane({
  value,
  ...props
}: NavigatorSecondaryPaneProps) {
  const { declareSecondaryPane } = use(NavigatorActionsContext)
  const { activeSection, listPaneShows } = use(NavigatorSelectionContext)
  const { overflowOpen } = use(NavigatorDisclosureContext)
  const stack = use(PaneStackContext)
  const moreOpen = stack === null ? overflowOpen : stack.moreOpen

  useEffect(() => declareSecondaryPane(value), [value, declareSecondaryPane])

  if (activeSection?.value !== value || moreOpen || !listPaneShows) {
    return null
  }
  return (
    <PaneKindContext value='section'>
      <PaneRoot role='list' data-navigator-section={value} {...props} />
    </PaneKindContext>
  )
}

NavigatorSecondaryPane.displayName = 'Navigator.SecondaryPane'
