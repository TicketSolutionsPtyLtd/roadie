'use client'

import { use } from 'react'

import { NavigatorSelectionContext } from './NavigatorContext'
import { NavigatorSectionList } from './NavigatorSectionList'

export type NavigatorSecondaryItemsProps = {
  className?: string
  /** Filters rows by label, case-insensitive. Groups left empty are hidden. */
  query?: string
}

/** The active section's sub-pages as a `List`. */
export function NavigatorSecondaryItems({
  className,
  query
}: NavigatorSecondaryItemsProps) {
  const { activeSection } = use(NavigatorSelectionContext)
  if (activeSection === null) return null
  return (
    <NavigatorSectionList
      data-slot='navigator-secondary-items'
      section={activeSection}
      query={query}
      className={className}
    />
  )
}

NavigatorSecondaryItems.displayName = 'Navigator.SecondaryItems'
