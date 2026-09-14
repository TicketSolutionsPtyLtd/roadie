'use client'

import type { ListProps } from '../List'
import { NavigatorSectionList } from './NavigatorSectionList'
import { useSection } from './useNavigatorSection'

export type NavigatorSectionItemsProps = Omit<ListProps, 'children'> & {
  /** The section's item value; omit for the active section. */
  value?: string
}

/** A section's declared items as a `List`, descriptions included; renders nothing when the section isn't found. */
export function NavigatorSectionItems({
  value,
  ...props
}: NavigatorSectionItemsProps) {
  const section = useSection(value)
  if (section === null) return null
  return (
    <NavigatorSectionList
      data-slot='navigator-section-items'
      data-navigator-items={section.value}
      section={section}
      descriptions
      {...props}
    />
  )
}

NavigatorSectionItems.displayName = 'Navigator.SectionItems'
