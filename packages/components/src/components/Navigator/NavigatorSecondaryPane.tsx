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
  'column' | 'reached' | 'depth' | 'tabBar' | 'id'
> & {
  /** The destination whose generated pane this replaces. */
  value: string
}

/** Replaces one destination's generated list pane. Declare it before your detail pane. */
export function NavigatorSecondaryPane({
  value,
  ...props
}: NavigatorSecondaryPaneProps) {
  const { declareSecondaryPane } = use(NavigatorActionsContext)
  const { activeSecondary, listPaneShows } = use(NavigatorSelectionContext)
  const { overflowOpen } = use(NavigatorDisclosureContext)
  const stack = use(PaneStackContext)
  const moreOpen = stack === null ? overflowOpen : stack.moreOpen

  useEffect(() => declareSecondaryPane(value), [value, declareSecondaryPane])

  if (activeSecondary?.value !== value || moreOpen || !listPaneShows) {
    return null
  }
  return (
    <PaneKindContext value='secondary'>
      <PaneRoot column='list' data-navigator-secondary={value} {...props} />
    </PaneKindContext>
  )
}

NavigatorSecondaryPane.displayName = 'Navigator.SecondaryPane'
