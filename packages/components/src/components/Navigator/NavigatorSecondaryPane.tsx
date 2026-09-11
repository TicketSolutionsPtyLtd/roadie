'use client'

import { use, useEffect } from 'react'

import { PaneRoot, type PaneRootProps } from '../Pane/PaneRoot'
import { PaneKindContext } from '../Pane/PaneStackContext'
import { NavigatorContext } from './NavigatorContext'

export type NavigatorSecondaryPaneProps = Omit<
  PaneRootProps,
  'role' | 'current' | 'primaryNav' | 'id'
> & {
  /** The section whose generated pane this replaces. */
  value: string
}

/** Replaces one section's generated list pane; declare it before your detail pane. */
export function NavigatorSecondaryPane({
  value,
  ...props
}: NavigatorSecondaryPaneProps) {
  const { activeSection, overflowOpen, declareSecondaryPane } =
    use(NavigatorContext)

  useEffect(() => declareSecondaryPane(value), [value, declareSecondaryPane])

  if (activeSection?.value !== value || overflowOpen) return null
  return (
    <PaneKindContext value='section'>
      <PaneRoot role='list' data-navigator-section={value} {...props} />
    </PaneKindContext>
  )
}

NavigatorSecondaryPane.displayName = 'Navigator.SecondaryPane'
