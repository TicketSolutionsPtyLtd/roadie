'use client'

import { useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneHeader } from '../Pane/PaneHeader'
import { PaneRoot } from '../Pane/PaneRoot'
import { PaneSearch } from '../Pane/PaneSearch'
import { PaneKindContext } from '../Pane/PaneStackContext'
import { PaneTitle } from '../Pane/PaneTitle'
import type { NavigatorActiveSecondary } from './NavigatorContext'
import { NavigatorSecondaryItems } from './NavigatorSecondaryItems'
import { textOf } from './splitSecondary'
import {
  navigatorSecondaryNavClass,
  navigatorSecondaryPaneClass
} from './variants'

export function NavigatorGeneratedSecondaryPane({
  secondary
}: {
  secondary: NavigatorActiveSecondary
}) {
  const [query, setQuery] = useState('')
  const { label, props: nav } = secondary

  return (
    <PaneKindContext value='generated-secondary'>
      <PaneRoot
        column='list'
        data-navigator-secondary={secondary.value}
        className={navigatorSecondaryPaneClass}
      >
        <PaneHeader>
          <PaneTitle>{label}</PaneTitle>
          {nav.searchable ? (
            <PaneSearch
              value={query}
              onValueChange={setQuery}
              aria-label={`Search ${textOf(label).toLowerCase()}`}
            />
          ) : null}
        </PaneHeader>
        <nav
          data-slot='navigator-secondary-nav'
          aria-label={nav['aria-label']}
          className={cn(navigatorSecondaryNavClass, nav.className)}
        >
          <NavigatorSecondaryItems showDescriptions={false} query={query} />
        </nav>
      </PaneRoot>
    </PaneKindContext>
  )
}

NavigatorGeneratedSecondaryPane.displayName = 'NavigatorGeneratedSecondaryPane'
