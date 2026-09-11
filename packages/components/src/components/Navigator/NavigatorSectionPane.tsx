'use client'

import { useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneHeader } from '../Pane/PaneHeader'
import { PaneRoot } from '../Pane/PaneRoot'
import { PaneSearch } from '../Pane/PaneSearch'
import { PaneTitle } from '../Pane/PaneTitle'
import type { NavigatorActiveSection } from './NavigatorContext'
import { NavigatorSecondaryItems } from './NavigatorSecondaryItems'
import { textOf } from './splitSecondary'

// Never `current`: first in the stack, so it is the root.
export function NavigatorSectionPane({
  section
}: {
  section: NavigatorActiveSection
}) {
  const [query, setQuery] = useState('')
  const { label, secondary } = section

  return (
    <PaneRoot role='list' data-navigator-section={section.value}>
      <PaneHeader>
        <PaneTitle>{label}</PaneTitle>
        {secondary.searchable ? (
          <PaneSearch
            value={query}
            onValueChange={setQuery}
            placeholder={`Search ${textOf(label).toLowerCase()}`}
          />
        ) : null}
      </PaneHeader>
      <nav
        data-slot='navigator-section-nav'
        aria-label={secondary['aria-label']}
        className={cn('pb-4', secondary.className)}
      >
        <NavigatorSecondaryItems query={query} />
      </nav>
    </PaneRoot>
  )
}

NavigatorSectionPane.displayName = 'NavigatorSectionPane'
