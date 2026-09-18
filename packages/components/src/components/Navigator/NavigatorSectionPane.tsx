'use client'

import { useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneHeader } from '../Pane/PaneHeader'
import { PaneRoot } from '../Pane/PaneRoot'
import { PaneSearch } from '../Pane/PaneSearch'
import { PaneKindContext } from '../Pane/PaneStackContext'
import { PaneTitle } from '../Pane/PaneTitle'
import type { NavigatorActiveSection } from './NavigatorContext'
import { NavigatorSectionItems } from './NavigatorSectionItems'
import { textOf } from './splitSecondary'

export function NavigatorSectionPane({
  section
}: {
  section: NavigatorActiveSection
}) {
  const [query, setQuery] = useState('')
  const { label, secondary } = section

  return (
    <PaneKindContext value='generated-section'>
      <PaneRoot column='list' data-navigator-section={section.value}>
        <PaneHeader>
          <PaneTitle>{label}</PaneTitle>
          {secondary.searchable ? (
            <PaneSearch
              value={query}
              onValueChange={setQuery}
              aria-label={`Search ${textOf(label).toLowerCase()}`}
            />
          ) : null}
        </PaneHeader>
        <nav
          data-slot='navigator-section-nav'
          aria-label={secondary['aria-label']}
          className={cn('pb-4', secondary.className)}
        >
          <NavigatorSectionItems showDescriptions={false} query={query} />
        </nav>
      </PaneRoot>
    </PaneKindContext>
  )
}

NavigatorSectionPane.displayName = 'NavigatorSectionPane'
