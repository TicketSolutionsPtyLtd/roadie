'use client'

import { use } from 'react'

import {
  type NavigatorActiveSecondary,
  NavigatorSelectionContext
} from './NavigatorContext'
import { findSecondaryByValue } from './activeSecondary'
import { type NavigatorSecondaryData, toSecondaryData } from './secondaryData'

/** The secondary with this `value`, or the active one without it. */
export function useSecondary(value?: string): NavigatorActiveSecondary | null {
  const { collected, activeSecondary } = use(NavigatorSelectionContext)
  return value === undefined
    ? activeSecondary
    : findSecondaryByValue(collected.ordered, value)
}

/** A secondary's declared items, or null when none is found. Omit `value` for the active secondary. */
export function useNavigatorSecondary(
  value?: string
): NavigatorSecondaryData | null {
  const { value: activeValue } = use(NavigatorSelectionContext)
  const secondary = useSecondary(value)
  return secondary === null ? null : toSecondaryData(secondary, activeValue)
}
