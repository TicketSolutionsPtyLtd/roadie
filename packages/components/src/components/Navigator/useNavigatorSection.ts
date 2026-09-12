'use client'

import { use } from 'react'

import { NavigatorContext } from './NavigatorContext'
import { findSectionByValue } from './activeSection'
import { type NavigatorSectionData, toSectionData } from './sectionData'

/** A section's declared items — the active section's without a `value` — or null when none is found. */
export function useNavigatorSection(
  value?: string
): NavigatorSectionData | null {
  const {
    primaryChildren,
    activeSection,
    value: activeValue
  } = use(NavigatorContext)
  const section =
    value === undefined
      ? activeSection
      : findSectionByValue(primaryChildren, value)
  return section === null ? null : toSectionData(section, activeValue)
}
