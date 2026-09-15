'use client'

import { use } from 'react'

import {
  type NavigatorActiveSection,
  NavigatorSelectionContext
} from './NavigatorContext'
import { findSectionByValue } from './activeSection'
import { type NavigatorSectionData, toSectionData } from './sectionData'

/** The section with this `value`, or the active one without it. */
export function useSection(value?: string): NavigatorActiveSection | null {
  const { slots, activeSection } = use(NavigatorSelectionContext)
  return value === undefined ? activeSection : findSectionByValue(slots, value)
}

/** A section's declared items — the active section's without a `value` — or null when none is found. */
export function useNavigatorSection(
  value?: string
): NavigatorSectionData | null {
  const { value: activeValue } = use(NavigatorSelectionContext)
  const section = useSection(value)
  return section === null ? null : toSectionData(section, activeValue)
}
