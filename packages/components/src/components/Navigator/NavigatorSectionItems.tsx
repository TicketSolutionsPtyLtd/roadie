'use client'

import { use } from 'react'

import type { ListProps } from '../List'
import { NavigatorContext } from './NavigatorContext'
import { NavigatorSectionList } from './NavigatorSectionList'
import { findSectionByValue } from './activeSection'

export type NavigatorSectionItemsProps = Omit<ListProps, 'children'> & {
  /** The section's item value; omit for the active section. */
  value?: string
}

/** A section's declared items as a `List`, descriptions included; renders nothing when the section isn't found. */
export function NavigatorSectionItems({
  value,
  ...props
}: NavigatorSectionItemsProps) {
  const { primaryChildren, activeSection } = use(NavigatorContext)
  const section =
    value === undefined
      ? activeSection
      : findSectionByValue(primaryChildren, value)
  if (section === null) return null
  return (
    <NavigatorSectionList
      data-slot='navigator-section-items'
      section={section}
      descriptions
      {...props}
    />
  )
}

NavigatorSectionItems.displayName = 'Navigator.SectionItems'
